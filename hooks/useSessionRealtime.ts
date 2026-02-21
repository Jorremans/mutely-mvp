import { useEffect, useRef, useCallback, useState } from 'react';
import { Session, Participant, SnitchEvent, getSessionById, getParticipants, getSnitchEvents } from '@/services/sessionService';

export interface RealtimeCallbacks {
  onParticipantJoin?: (participant: Participant) => void;
  onParticipantLeave?: (participant: Participant) => void;
  onParticipantUpdate?: (participant: Participant) => void;
  onSessionStart?: (session: Session) => void;
  onSessionEnd?: (session: Session) => void;
  onSessionUpdate?: (session: Session) => void;
  onSnitchEvent?: (event: SnitchEvent, participantName: string) => void;
}

export interface UseSessionRealtimeOptions {
  sessionId: string;
  callbacks: RealtimeCallbacks;
  participantsMap?: Map<string, Participant>;
  pollingInterval?: number; // milliseconds, default 2000
}

export const useSessionRealtime = ({
  sessionId,
  callbacks,
  participantsMap,
  pollingInterval = 2000
}: UseSessionRealtimeOptions) => {
  const callbacksRef = useRef(callbacks);
  const participantsMapRef = useRef(participantsMap);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSessionRef = useRef<Session | null>(null);
  const lastParticipantsRef = useRef<Map<string, Participant>>(new Map());
  const lastSnitchCountRef = useRef<number>(0);
  const [isPolling, setIsPolling] = useState(false);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Keep participants map ref updated
  useEffect(() => {
    participantsMapRef.current = participantsMap;
  }, [participantsMap]);

  // Polling-based realtime updates
  useEffect(() => {
    if (!sessionId) return;

    const pollForUpdates = async () => {
      try {
        // Fetch current session state
        const session = await getSessionById(sessionId);
        if (!session) return;

        // Check for session status changes
        if (lastSessionRef.current) {
          const prevStatus = lastSessionRef.current.status;
          const newStatus = session.status;

          if (prevStatus !== newStatus) {
            if (newStatus === 'running' && callbacksRef.current.onSessionStart) {
              callbacksRef.current.onSessionStart(session);
            } else if (newStatus === 'ended' && callbacksRef.current.onSessionEnd) {
              callbacksRef.current.onSessionEnd(session);
            }
          }

          if (callbacksRef.current.onSessionUpdate) {
            callbacksRef.current.onSessionUpdate(session);
          }
        }
        lastSessionRef.current = session;

        // Fetch current participants
        const participants = await getParticipants(sessionId);
        const currentParticipantsMap = new Map<string, Participant>();
        
        for (const participant of participants) {
          currentParticipantsMap.set(participant.id, participant);

          const prevParticipant = lastParticipantsRef.current.get(participant.id);
          
          if (!prevParticipant) {
            // New participant joined
            if (callbacksRef.current.onParticipantJoin) {
              callbacksRef.current.onParticipantJoin(participant);
            }
          } else if (!participant.is_active && prevParticipant.is_active) {
            // Participant left
            if (callbacksRef.current.onParticipantLeave) {
              callbacksRef.current.onParticipantLeave(participant);
            }
          } else if (participant.snitch_count !== prevParticipant.snitch_count) {
            // Participant updated (snitch count changed)
            if (callbacksRef.current.onParticipantUpdate) {
              callbacksRef.current.onParticipantUpdate(participant);
            }
          }
        }

        lastParticipantsRef.current = currentParticipantsMap;

        // Check for new snitch events (sorted by created_at descending, so newest first)
        const snitchEvents = await getSnitchEvents(sessionId);
        
        // Only process if we have new events
        if (snitchEvents.length > 0) {
          // Get events we haven't seen yet
          const newEventsCount = snitchEvents.length - lastSnitchCountRef.current;
          
          if (newEventsCount > 0) {
            // Events are sorted descending, so take the first N new ones
            const newEvents = snitchEvents.slice(0, newEventsCount).reverse();
            
            for (const event of newEvents) {
              if (callbacksRef.current.onSnitchEvent) {
                // Look up participant name from map (no participant_name column in snitch_events table)
                const participantName = 
                  participantsMapRef.current?.get(event.participant_id)?.name || 
                  'Iemand';
                callbacksRef.current.onSnitchEvent(event, participantName);
              }
            }
            lastSnitchCountRef.current = snitchEvents.length;
          }
        }

      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    pollForUpdates();
    setIsPolling(true);

    // Set up polling interval
    intervalRef.current = setInterval(pollForUpdates, pollingInterval);

    console.log('Polling started for session:', sessionId);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
      lastSessionRef.current = null;
      lastParticipantsRef.current = new Map();
      lastSnitchCountRef.current = 0;
    };
  }, [sessionId, pollingInterval]);

  // Function to manually unsubscribe
  const unsubscribe = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Function to force refresh
  const refresh = useCallback(async () => {
    if (!sessionId) return;

    try {
      const session = await getSessionById(sessionId);
      if (session && callbacksRef.current.onSessionUpdate) {
        callbacksRef.current.onSessionUpdate(session);
      }
      lastSessionRef.current = session;

      const participants = await getParticipants(sessionId);
      const currentParticipantsMap = new Map<string, Participant>();
      for (const participant of participants) {
        currentParticipantsMap.set(participant.id, participant);
      }
      lastParticipantsRef.current = currentParticipantsMap;
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [sessionId]);

  return { unsubscribe, refresh, isPolling };
};

export default useSessionRealtime;
