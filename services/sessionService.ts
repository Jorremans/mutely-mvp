import { supabase } from '@/app/lib/supabase';

// Types
export interface Session {
  id: string;
  code: string;
  session_name: string;
  duration_minutes: number;
  host_id: string;
  status: 'waiting' | 'running' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  role: 'host' | 'guest';
  snitch_count: number;
  is_active: boolean;
  last_snitch_at: string | null;
  created_at: string;
}

export interface SnitchEvent {
  id: string;
  session_id: string;
  participant_id: string;
  event_type: string;
  created_at: string;
}




export interface SessionSummary {
  session: Session;
  participants: Participant[];
  events: SnitchEvent[];
}

// Generate a random 6-character session code
function generateSessionCode(): string {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}


// Generate a UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Create a new session
export async function createSession(
  hostName: string,
  sessionName: string = 'Focus Sessie',
  durationMinutes: number = 30
): Promise<{ code: string; sessionId: string; hostId: string } | null> {
  const sessionId = generateUUID();
  const participantId = generateUUID();
  const code = generateSessionCode();
  const now = new Date().toISOString();

  try {
    // Create the session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        code: code,
        session_name: sessionName,
        duration_minutes: durationMinutes,
        host_id: participantId,
        status: 'waiting',
        started_at: null,
        ended_at: null,
        created_at: now
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // Create the host participant
    const { error: participantError } = await supabase
      .from('participants')
      .insert({
        id: participantId,
        session_id: sessionId,
        name: hostName,
        role: 'host',
        snitch_count: 0,
        is_active: true,
        last_snitch_at: null,
        created_at: now
      });

    if (participantError) {
      console.error('Error creating participant:', participantError);
      // Try to clean up the session
      await supabase.from('sessions').delete().eq('id', sessionId);
      throw new Error(`Failed to create participant: ${participantError.message}`);
    }

    return {
      code: code,
      sessionId: sessionId,
      hostId: participantId
    };
  } catch (error) {
    console.error('Error in createSession:', error);
    return null;
  }
}

// Join an existing session
export async function joinSession(
  code: string,
  userName: string
): Promise<{ session: Session; sessionId: string; participantId: string } | null> {
  try {
    // Find the session by code
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (sessionError || !sessionData) {
      console.error('Session not found:', sessionError);
      throw new Error('Session not found. Please check the code and try again.');
    }

    if (sessionData.status === 'ended') {
      throw new Error('This session has already ended.');
    }

    const participantId = generateUUID();
    const now = new Date().toISOString();

    // Create the participant
    const { error: participantError } = await supabase
      .from('participants')
      .insert({
        id: participantId,
        session_id: sessionData.id,
        name: userName,
        role: 'guest',
        snitch_count: 0,
        is_active: true,
        last_snitch_at: null,
        created_at: now
      });

    if (participantError) {
      console.error('Error joining session:', participantError);
      throw new Error(`Failed to join session: ${participantError.message}`);
    }

    return {
      session: sessionData as Session,
      sessionId: sessionData.id,
      participantId: participantId
    };
  } catch (error) {
    console.error('Error in joinSession:', error);
    return null;
  }
}

// Get session by ID
export async function getSessionById(sessionId: string): Promise<Session | null> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return data as Session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Get session by code
export async function getSessionByCode(code: string): Promise<Session | null> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error) {
      console.error('Error getting session by code:', error);
      return null;
    }

    return data as Session;
  } catch (error) {
    console.error('Error getting session by code:', error);
    return null;
  }
}

// Get participants for a session
export async function getParticipants(sessionId: string): Promise<Participant[]> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting participants:', error);
      return [];
    }

    return (data || []) as Participant[];
  } catch (error) {
    console.error('Error getting participants:', error);
    return [];
  }
}

// Get participant by ID
export async function getParticipantById(participantId: string): Promise<Participant | null> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .single();

    if (error) {
      console.error('Error getting participant:', error);
      return null;
    }

    return data as Participant;
  } catch (error) {
    console.error('Error getting participant:', error);
    return null;
  }
}

// Start a session
export async function startSession(sessionId: string): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'running',
        started_at: now
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error starting session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error starting session:', error);
    return false;
  }
}

// End a session
export async function endSession(sessionId: string): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'ended',
        ended_at: now
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error ending session:', error);
    return false;
  }
}

// =============================================
// SNITCH EVENT LOGGING - SINGLE SOURCE OF TRUTH
// =============================================

export type SnitchEventType = 'left_session' | 'left_session_screen' | 'app_background_other_app' | 'background_switch' | 'test_event';


export interface LogSnitchResult {
  success: boolean;
  error?: string;
  eventId?: string;
  newCount?: number;
}

/**
 * logSnitchEvent - Single function for all snitch logging
 * 
 * This function ALWAYS attempts to insert into Supabase and NEVER fails silently.
 * On error, it logs to console AND returns the error for on-screen display.
 * 
 * @param sessionId - The session ID
 * @param participantId - The participant ID
 * @param eventType - Type of snitch event
 * @returns LogSnitchResult with success status, error message, and event details
 */
export async function logSnitchEvent(
  sessionId: string,
  participantId: string,
  eventType: SnitchEventType
): Promise<LogSnitchResult> {
  console.log(`[logSnitchEvent] Starting - sessionId: ${sessionId}, participantId: ${participantId}, eventType: ${eventType}`);

  try {
    // Insert snitch event into database
    // Table: public.snitch_events
    // Columns: id (auto), session_id, participant_id, event_type, created_at (auto)
    console.log('[logSnitchEvent] Inserting snitch event into database...');
    console.log('[logSnitchEvent] Insert payload:', JSON.stringify({
      session_id: sessionId,
      participant_id: participantId,
      event_type: eventType,
    }));

    const { data: insertData, error: eventError } = await supabase
      .from('snitch_events')
      .insert({
        session_id: sessionId,
        participant_id: participantId,
        event_type: eventType,
      })
      .select()
      .single();

    if (eventError) {
      const errorMsg = `DB INSERT FAILED: ${eventError.message} (code: ${eventError.code})`;
      console.error(`[logSnitchEvent] ${errorMsg}`);
      console.error('[logSnitchEvent] Full error:', JSON.stringify(eventError, null, 2));
      return {
        success: false,
        error: errorMsg,
      };
    }

    const eventId = insertData?.id;
    console.log('[logSnitchEvent] Snitch event inserted successfully:', eventId);

    // Update participant snitch count
    let newCount = 1;
    try {
      const { data: participantData, error: getError } = await supabase
        .from('participants')
        .select('snitch_count')
        .eq('id', participantId)
        .single();

      if (getError) {
        console.error('[logSnitchEvent] Failed to get current snitch count:', getError);
      } else {
        newCount = (participantData?.snitch_count || 0) + 1;
      }

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('participants')
        .update({
          snitch_count: newCount,
          last_snitch_at: now
        })
        .eq('id', participantId);

      if (updateError) {
        console.error('[logSnitchEvent] Failed to update snitch count:', updateError);
        // Don't fail the whole operation - the event was logged
      } else {
        console.log(`[logSnitchEvent] Updated snitch count to ${newCount}`);
      }
    } catch (countError) {
      console.error('[logSnitchEvent] Error updating snitch count:', countError);
      // Don't fail the whole operation - the event was logged
    }

    console.log(`[logSnitchEvent] SUCCESS - Event ID: ${eventId}, Type: ${eventType}, Count: ${newCount}`);
    return {
      success: true,
      eventId: eventId,
      newCount: newCount,
    };

  } catch (error) {
    const errorMsg = `UNEXPECTED ERROR: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[logSnitchEvent] ${errorMsg}`);
    console.error('[logSnitchEvent] Full error:', error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}


// Legacy function - now wraps logSnitchEvent for backward compatibility
// Record a snitch event
export async function recordSnitch(
  sessionId: string,
  participantId: string,
  eventType: string = 'app_background'
): Promise<{ success: boolean; newCount: number }> {
  const result = await logSnitchEvent(sessionId, participantId, eventType as SnitchEventType);
  return {
    success: result.success,
    newCount: result.newCount || 0,
  };
}




// Get snitch events for a session
export async function getSnitchEvents(sessionId: string): Promise<SnitchEvent[]> {
  try {
    const { data, error } = await supabase
      .from('snitch_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting snitch events:', error);
      return [];
    }

    return (data || []) as SnitchEvent[];
  } catch (error) {
    console.error('Error getting snitch events:', error);
    return [];
  }
}

// Get snitch events filtered by event_type = 'left_session' or 'background_switch' for Wall of Shame
export async function getLeftSessionEvents(sessionId: string): Promise<SnitchEvent[]> {
  try {
    const { data, error } = await supabase
      .from('snitch_events')
      .select('*')
      .eq('session_id', sessionId)
      .in('event_type', ['left_session', 'background_switch'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting left_session events:', error);
      return [];
    }

    return (data || []) as SnitchEvent[];
  } catch (error) {
    console.error('Error getting left_session events:', error);
    return [];
  }
}



// Get session summary
export async function getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
  try {
    const [session, participants, events] = await Promise.all([
      getSessionById(sessionId),
      getParticipants(sessionId),
      getSnitchEvents(sessionId)
    ]);

    if (!session) {
      return null;
    }

    return {
      session,
      participants,
      events
    };
  } catch (error) {
    console.error('Error getting session summary:', error);
    return null;
  }
}

// --------------------------
// REALTIME SNITCH LISTENER
// --------------------------

export function subscribeToSnitchEvents(
  sessionId: string,
  callback: (event: SnitchEvent) => void
) {
  const channel = supabase
    .channel(`snitch_events:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'snitch_events',
        filter: `session_id=eq.${sessionId}`
      },
      (payload) => {
        callback(payload.new as SnitchEvent);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Leave a session
export async function leaveSession(participantId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('participants')
      .update({ is_active: false })
      .eq('id', participantId);

    if (error) {
      console.error('Error leaving session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error leaving session:', error);
    return false;
  }
}
