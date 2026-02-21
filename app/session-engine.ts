/**
 * Mutely Session Engine
 * Offline-first, in-memory session management
 */

export interface Participant {
  id: string;
  name: string;
}

export interface Session {
  sessionId: string;
  host: string;
  participants: Participant[];
  status: 'idle' | 'waiting' | 'live' | 'ended';
}

// In-memory session state
let currentSession: Session = {
  sessionId: '',
  host: '',
  participants: [],
  status: 'idle',
};

// Listeners for state changes
type SessionListener = (session: Session) => void;
const listeners: Set<SessionListener> = new Set();

// Helper to generate random ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 8);
};

// Helper to notify all listeners
const notifyListeners = (): void => {
  const sessionCopy = { ...currentSession, participants: [...currentSession.participants] };
  listeners.forEach((listener) => listener(sessionCopy));
};

/**
 * Create a new session as host
 */
export const createSession = (hostName: string): Session => {
  const sessionId = Math.floor(100000 + Math.random() * 900000).toString();
  
  currentSession = {
    sessionId,
    host: hostName,
    participants: [
      { id: generateId(), name: hostName }
    ],
    status: 'waiting',
  };
  
  notifyListeners();
  return { ...currentSession, participants: [...currentSession.participants] };
};

/**
 * Join an existing session as participant
 */
export const joinSession = (sessionId: string, name: string): void => {
  // If no session exists or different session, create a simulated one
  if (currentSession.sessionId !== sessionId) {
    currentSession = {
      sessionId,
      host: 'Host',
      participants: [
        { id: generateId(), name: 'Host' }
      ],
      status: 'waiting',
    };
  }
  
  // Add participant if not already in list
  const existingParticipant = currentSession.participants.find(
    (p) => p.name === name
  );
  
  if (!existingParticipant) {
    currentSession.participants.push({
      id: generateId(),
      name,
    });
  }
  
  notifyListeners();
};

/**
 * Start the session (host only)
 */
export const startSession = (): void => {
  if (currentSession.status === 'waiting') {
    currentSession = {
      ...currentSession,
      status: 'live',
    };
    notifyListeners();
  }
};

/**
 * End the session
 */
export const endSession = (): void => {
  currentSession = {
    ...currentSession,
    status: 'ended',
  };
  notifyListeners();
};

/**
 * Get current session state
 */
export const getSessionState = (): Session => {
  return { ...currentSession, participants: [...currentSession.participants] };
};

/**
 * Subscribe to session state changes
 * Returns unsubscribe function
 */
export const subscribeToSessionState = (listener: SessionListener): (() => void) => {
  listeners.add(listener);
  
  // Immediately call with current state
  listener({ ...currentSession, participants: [...currentSession.participants] });
  
  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Reset session to idle state
 */
export const resetSession = (): void => {
  currentSession = {
    sessionId: '',
    host: '',
    participants: [],
    status: 'idle',
  };
  notifyListeners();
};
