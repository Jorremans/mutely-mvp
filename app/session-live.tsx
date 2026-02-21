import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, AppState, AppStateStatus, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SnithWarningModal from '../components/SnithWarningModal';
import LeaveSessionModal from '../components/LeaveSessionModal';
import SnitchBanner, { DisplayMode } from '../components/SnitchBanner';
import SnitchReturnBanner from '../components/SnitchReturnBanner';
import BreakReturnOverlay from '../components/BreakReturnOverlay';
import BreakPulseOverlay from '../components/BreakPulseOverlay';
import WallOfShame, { WallOfShameEvent } from '../components/WallOfShame';
import DisplayModeToggle from '../components/DisplayModeToggle';
import { useSnitchDetector, SnitchEventType as DetectorSnitchEventType } from './useSnitchDetector';
import { useSessionRealtime } from '@/hooks/useSessionRealtime';
import { 
  endSession as endSessionService, 
  logSnitchEvent,
  getParticipants,
  getSessionById,
  getLeftSessionEvents,
  Participant,
  Session,
  SnitchEvent,
  SnitchEventType,
  LogSnitchResult
} from '@/services/sessionService';


// DEV flag - set to false for production
const __DEV_SHOW_DEBUG_BUTTON__ = false;

/**
 * Sessie Live Scherm
 * 
 * Timer Logica:
 * - Timer is gebaseerd op server timestamps (started_at + duration_minutes)
 * - Resterende tijd = ends_at - now()
 * - Bij app resume wordt timer herberekend vanuit server
 * 
 * Snitch Logica:
 * - Geen grace period (5s lock screen bescherming)
 * - Geen cooldown
 * - Elke app-switch = overtreding
 * 
 * TRIGGERT OVERTREDING:
 * 1. Deelnemer drukt op sluitknop ("X") en bevestigt "Toch verlaten"
 * 2. Deelnemer navigeert weg van het live sessiescherm
 * 3. Deelnemer schakelt naar andere app (>5s weg)
 * 
 * TRIGGERT NIET:
 * - Scherm dimmen / vergrendeling (<5s)
 * - Opladen
 * - Scherm aan/uit
 */
export default function SessionLiveScreen() {
  const router = useRouter();
  const { code, sessionId, participantId, name, duration, isHost } = useLocalSearchParams();
  
  const [timeLeft, setTimeLeft] = useState(parseInt(duration as string) * 60);
  const [showHostEndModal, setShowHostEndModal] = useState(false);
  const [showParticipantLeaveModal, setShowParticipantLeaveModal] = useState(false);
  const [showSnitchReturnBanner, setShowSnitchReturnBanner] = useState(false);
  const [showBreakReturnOverlay, setShowBreakReturnOverlay] = useState(false);
  const [showBreakPulse, setShowBreakPulse] = useState(false);
  const [snitchBanner, setSnitchBanner] = useState<{ visible: boolean; name: string; durationStayed?: string }>({
    visible: false,
    name: '',
    durationStayed: undefined,
  });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  
  // Weergavemodus state (host-gecontroleerd)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('friendly');
  
  // Wall of Shame events
  const [wallOfShameEvents, setWallOfShameEvents] = useState<WallOfShameEvent[]>([]);
  
  // Debug state
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  const isHostUser = isHost === 'true';
  
  // Server-based timer refs
  const endsAtRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track of we bewust weggaan
  const isLeavingIntentionally = useRef(false);
  const isScreenFocused = useRef(true);

  // Map van deelnemers voor de realtime hook
  const participantsMapRef = useRef(new Map<string, Participant>());

  useEffect(() => {
    const map = new Map<string, Participant>();
    participants.forEach(p => map.set(p.id, p));
    participantsMapRef.current = map;
  }, [participants]);

  // =============================================
  // WALL OF SHAME HELPERS
  // =============================================
  
  const formatDuration = (startedAt: string, eventCreatedAt: string): string => {
    const start = new Date(startedAt).getTime();
    const end = new Date(eventCreatedAt).getTime();
    const durationMs = end - start;
    
    if (durationMs < 0) return '00:00';
    
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  const convertToWallOfShameEvent = (
    event: SnitchEvent,
    participantName: string,
    sessionStartedAt: string
  ): WallOfShameEvent => {
    return {
      id: event.id,
      participantName,
      timestamp: formatTimestamp(event.created_at),
      durationStayed: formatDuration(sessionStartedAt, event.created_at),
      createdAt: event.created_at,
      eventType: event.event_type,
    };
  };
  
  const loadWallOfShameEvents = useCallback(async () => {
    if (!sessionId || !sessionData?.started_at) return;
    
    const events = await getLeftSessionEvents(sessionId as string);
    const wallEvents: WallOfShameEvent[] = [];
    
    for (const event of events) {
      const participant = participantsMapRef.current.get(event.participant_id);
      const participantName = participant?.name || 'Onbekend';
      
      wallEvents.push(convertToWallOfShameEvent(
        event,
        participantName,
        sessionData.started_at
      ));
    }
    
    setWallOfShameEvents(wallEvents);
  }, [sessionId, sessionData?.started_at]);
  
  useEffect(() => {
    if (sessionData?.started_at) {
      loadWallOfShameEvents();
    }
  }, [sessionData?.started_at, loadWallOfShameEvents]);

  // =============================================
  // SNITCH LOGGING FUNCTIE
  // =============================================
  const doLogSnitch = useCallback(async (eventType: SnitchEventType): Promise<LogSnitchResult> => {
    if (!sessionId || !participantId) {
      const error = 'Ontbrekend sessionId of participantId';
      console.error(`[SessionLive] ${error}`);
      setDebugError(error);
      return { success: false, error };
    }

    if (isHostUser) {
      console.log('[SessionLive] Host - snitch log overgeslagen');
      return { success: true };
    }

    if (sessionData?.status !== 'running') {
      console.log(`[SessionLive] Sessie niet actief (${sessionData?.status}) - snitch log overgeslagen`);
      return { success: true };
    }

    console.log(`[SessionLive] Overtreding loggen: ${eventType}`);
    setDebugMessage(`Overtreding loggen: ${eventType}...`);

    const result = await logSnitchEvent(
      sessionId as string,
      participantId as string,
      eventType
    );

    if (result.success) {
      setDebugMessage(`Overtreding gelogd! Type: ${eventType}, Aantal: ${result.newCount}`);
      setDebugError(null);
    } else {
      setDebugError(result.error || 'Onbekende fout');
      setDebugMessage(null);
    }

    setTimeout(() => {
      setDebugMessage(null);
    }, 5000);

    return result;
  }, [sessionId, participantId, isHostUser, sessionData?.status]);

  // =============================================
  // SNITCH DETECTOR
  // =============================================
  const handleLogSnitchFromDetector = useCallback(async (eventType: DetectorSnitchEventType) => {
    await doLogSnitch(eventType as SnitchEventType);
  }, [doLogSnitch]);

  const handleShowReturnWarning = useCallback(() => {
    console.log('[SessionLive] Terugkeer na overtreding - overlay tonen');
    // Toon de volledige terugkeer overlay (niet alleen de banner)
    setShowBreakReturnOverlay(true);
  }, []);

  useSnitchDetector({
    onLogSnitch: handleLogSnitchFromDetector,
    onShowReturnWarning: handleShowReturnWarning,
    enabled: sessionData?.status === 'running' && !isHostUser,
    isHost: isHostUser,
  });

  // =============================================
  // BREAK RETURN OVERLAY HANDLERS
  // =============================================
  const handleReturnToSession = () => {
    setShowBreakReturnOverlay(false);
    // Deelnemer blijft in sessie maar is gemarkeerd als verbroken
  };

  const handleLeaveFromBreakOverlay = async () => {
    setShowBreakReturnOverlay(false);
    isLeavingIntentionally.current = true;
    
    // Log verlaten event
    await doLogSnitch('left_session');
    
    router.replace('/');
  };

  // =============================================
  // DETECTEER NAVIGATIE WEG VAN SCHERM
  // =============================================
  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;

      return () => {
        isScreenFocused.current = false;

        if (!isLeavingIntentionally.current && !isHostUser && sessionData?.status === 'running') {
          logSnitchEvent(
            sessionId as string,
            participantId as string,
            'left_session_screen'
          ).then(result => {
            if (!result.success) {
              console.error('[SessionLive] Navigatie snitch loggen mislukt:', result.error);
            }
          });
        }
      };
    }, [sessionId, participantId, isHostUser, sessionData?.status])
  );

  // Laad initiële sessiedata
  useEffect(() => {
    loadSessionData();
    loadParticipants();
  }, [sessionId]);

  const loadSessionData = async () => {
    if (!sessionId) return;
    
    const session = await getSessionById(sessionId as string);
    if (session) {
      setSessionData(session);
      
      if (session.started_at && session.duration_minutes) {
        const startedAt = new Date(session.started_at).getTime();
        const durationMs = session.duration_minutes * 60 * 1000;
        endsAtRef.current = startedAt + durationMs;
        updateRemainingTime();
      }
    }
  };

  const loadParticipants = async () => {
    if (!sessionId) return;
    const data = await getParticipants(sessionId as string);
    setParticipants(data);
  };

  const updateRemainingTime = useCallback(() => {
    if (!endsAtRef.current) return;
    
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endsAtRef.current - now) / 1000));
    
    setTimeLeft(remaining);
    
    if (remaining <= 0) {
      handleSessionEnd();
    }
  }, []);

  // Timer interval
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      updateRemainingTime();
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [updateRemainingTime]);

  // Herbereken timer bij app resume
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        updateRemainingTime();
      }
    });
    return () => subscription.remove();
  }, [updateRemainingTime]);

  const handleSessionEnd = async () => {
    if (isHostUser && sessionId) {
      await endSessionService(sessionId as string);
    }
    isLeavingIntentionally.current = true;
    router.replace(`/session-summary?code=${code}&sessionId=${sessionId}&participantId=${participantId}&name=${name}&duration=${duration}`);
  };

  // Realtime callbacks
  const handleParticipantUpdate = useCallback((participant: Participant) => {
    setParticipants(prev => 
      prev.map(p => p.id === participant.id ? participant : p)
    );
  }, []);

  const handleSessionEnded = useCallback((session: Session) => {
    isLeavingIntentionally.current = true;
    router.replace(`/session-summary?code=${code}&sessionId=${sessionId}&participantId=${participantId}&name=${name}&duration=${duration}`);
  }, [code, sessionId, participantId, name, duration]);

  const handleSessionUpdate = useCallback((session: Session) => {
    setSessionData(session);
    
    if (session.started_at && session.duration_minutes) {
      const startedAt = new Date(session.started_at).getTime();
      const durationMs = session.duration_minutes * 60 * 1000;
      endsAtRef.current = startedAt + durationMs;
      updateRemainingTime();
    }
  }, [updateRemainingTime]);

  const handleSnitchEvent = useCallback((event: SnitchEvent, participantName: string) => {
    // Toon geen snitch voor jezelf
    if (event.participant_id === participantId) return;
    
    // Bereken duur tot overtreding
    let durationStayed: string | undefined;
    if (sessionData?.started_at) {
      durationStayed = formatDuration(sessionData.started_at, event.created_at);
    }
    
    // Toon banner met naam en tijd
    setSnitchBanner({ visible: true, name: participantName, durationStayed });
    
    // Rode pulse overlay
    setShowBreakPulse(true);
    
    // Haptische feedback (korte vibratie)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics niet beschikbaar op dit apparaat
    }
    
    // Voeg toe aan wall of shame
    if ((event.event_type === 'left_session' || event.event_type === 'background_switch') && sessionData?.started_at) {
      const wallEvent = convertToWallOfShameEvent(
        event,
        participantName,
        sessionData.started_at
      );
      
      setWallOfShameEvents(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, wallEvent];
      });
    }
  }, [participantId, sessionData?.started_at]);

  // Abonneer op realtime updates
  useSessionRealtime({
    sessionId: sessionId as string,
    callbacks: {
      onParticipantUpdate: handleParticipantUpdate,
      onSessionEnd: handleSessionEnded,
      onSessionUpdate: handleSessionUpdate,
      onSnitchEvent: handleSnitchEvent,
    },
    participantsMap: participantsMapRef.current
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sluitknop handler
  const handleCloseButtonPress = () => {
    if (isHostUser) {
      setShowHostEndModal(true);
    } else {
      setShowParticipantLeaveModal(true);
    }
  };

  // Host beëindigt sessie
  const handleHostEndSession = async () => {
    if (sessionId) {
      await endSessionService(sessionId as string);
    }
    isLeavingIntentionally.current = true;
    router.replace('/');
  };

  // Deelnemer verlaat met snitch
  const handleParticipantLeaveWithSnitch = async () => {
    isLeavingIntentionally.current = true;
    
    const result = await doLogSnitch('left_session');
    
    if (!result.success) {
      Alert.alert('Waarschuwing', `Overtreding loggen mislukt: ${result.error}\n\nJe wordt alsnog doorgestuurd.`);
    }
    
    router.replace('/');
  };

  // Wissel weergavemodus
  const handleToggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'friendly' ? 'savage' : 'friendly');
  };

  return (
    <View style={styles.container}>
      {/* Rode pulse overlay bij overtreding van anderen */}
      <BreakPulseOverlay
        visible={showBreakPulse}
        onComplete={() => setShowBreakPulse(false)}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Snitch Banner voor anderen */}
        <SnitchBanner
          name={snitchBanner.name}
          visible={snitchBanner.visible}
          isHost={isHostUser}
          displayMode={displayMode}
          durationStayed={snitchBanner.durationStayed}
          onHide={() => setSnitchBanner({ visible: false, name: '', durationStayed: undefined })}
        />

        {/* Snitch Terugkeer Banner (subtiel) */}
        <SnitchReturnBanner
          visible={showSnitchReturnBanner}
          onDismiss={() => setShowSnitchReturnBanner(false)}
        />

        {/* Debug Berichten */}
        {__DEV_SHOW_DEBUG_BUTTON__ && debugMessage && (
          <View style={styles.debugBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
            <Text style={styles.debugText}>{debugMessage}</Text>
          </View>
        )}
        {__DEV_SHOW_DEBUG_BUTTON__ && debugError && (
          <View style={styles.debugErrorBanner}>
            <Ionicons name="alert-circle" size={16} color="#E74C3C" />
            <Text style={styles.debugErrorText}>{debugError}</Text>
          </View>
        )}

        {/* Sluitknop */}
        <TouchableOpacity 
          style={styles.stopButton}
          onPress={handleCloseButtonPress}
        >
          <Ionicons name="close-circle" size={32} color="#121212" />
        </TouchableOpacity>

        {/* Weergavemodus toggle (alleen host) */}
        {isHostUser && (
          <View style={styles.modeToggleContainer}>
            <DisplayModeToggle 
              mode={displayMode}
              onToggle={handleToggleDisplayMode}
            />
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Image
              source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763416152283_900b6d28.png' }}
              style={styles.watermark}
              resizeMode="contain"
            />
            <View style={styles.timerContainer}>
              <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
              <Text style={styles.label}>Focustijd</Text>
              
              <View style={styles.participantInfo}>
                <Ionicons name="people" size={20} color="#666" />
                <Text style={styles.participantCount}>
                  {participants.length} deelnemer{participants.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Wall of Shame */}
          <WallOfShame 
            events={wallOfShameEvents}
            displayMode={displayMode}
          />

          {/* DEBUG: Test Snitch Knop */}
          {__DEV_SHOW_DEBUG_BUTTON__ && isHostUser && (
            <View style={styles.debugContainer}>
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={async () => {
                  if (!sessionId || !participantId) return;
                  const result = await logSnitchEvent(sessionId as string, participantId as string, 'test_event');
                  if (result.success) {
                    Alert.alert('Gelukt', `Test event aangemaakt!\nEvent ID: ${result.eventId}`);
                  } else {
                    Alert.alert('Fout', `Test mislukt:\n${result.error}`);
                  }
                }}
              >
                <Ionicons name="bug" size={16} color="#FFF" />
                <Text style={styles.debugButtonText}>Debug: Test snitch</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Host sessie beëindigen modal */}
        <SnithWarningModal
          visible={showHostEndModal}
          onStay={() => setShowHostEndModal(false)}
          onLeave={handleHostEndSession}
        />

        {/* Deelnemer sessie verlaten modal */}
        <LeaveSessionModal
          visible={showParticipantLeaveModal}
          onCancel={() => setShowParticipantLeaveModal(false)}
          onLeave={handleParticipantLeaveWithSnitch}
        />

        {/* Terugkeer na overtreding overlay */}
        <BreakReturnOverlay
          visible={showBreakReturnOverlay}
          onReturnToSession={handleReturnToSession}
          onLeaveSession={handleLeaveFromBreakOverlay}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F4F8' },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  stopButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  modeToggleContainer: { 
    position: 'absolute', 
    top: 55, 
    left: 20, 
    zIndex: 10 
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  watermark: { position: 'absolute', width: 350, height: 350, opacity: 0.18 },
  timerContainer: { alignItems: 'center', zIndex: 1 },
  timer: { fontSize: 72, fontWeight: 'bold', color: '#121212', marginBottom: 16 },
  label: { fontSize: 20, color: '#121212', opacity: 0.7 },
  
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  participantCount: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },

  // Debug UI styles
  debugContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8E44AD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  debugButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  debugBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(39, 174, 96, 0.9)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  debugText: {
    color: '#FFF',
    fontSize: 12,
    flex: 1,
  },
  debugErrorBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  debugErrorText: {
    color: '#FFF',
    fontSize: 12,
    flex: 1,
  },
});
