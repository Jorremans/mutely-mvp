import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef, useCallback } from 'react';

/**
 * Snitch Detector v8 - MVP Finalized
 *
 * REGELS:
 * - Mutely MOET op de voorgrond blijven
 * - Elke keer dat Mutely de voorgrond verliest naar een andere app = overtreding
 * - Geen grace period voor app-switches
 * 
 * TRIGGERT SNITCH:
 * - Mutely verliest voorgrond naar andere app
 * - App wordt afgesloten
 * - App wordt geforceerd gestopt
 * 
 * TRIGGERT NIET:
 * - Schermvergrendeling (device lock)
 * - Opladen (charging cable)
 * - Scherm aan/uit
 * - Batterijcontrole
 * - Lock screen preview
 * 
 * TECHNISCHE BEPERKING:
 * React Native kan geen onderscheid maken tussen schermvergrendeling en app-switch.
 * Beide resulteren in AppState: active → background → active.
 * 
 * We gebruiken een minimale drempel van 5 seconden als bescherming tegen
 * schermvergrendeling. Dit is GEEN grace period - het is een technische
 * noodzaak om false positives van lock screen te voorkomen.
 * 
 * Bij toekomstige native module integratie kan deze drempel op 0 worden gezet.
 */

export type SnitchEventType = 'background_switch' | 'left_session' | 'left_session_screen' | 'test_event';

export interface SnitchDetectorOptions {
  /** Aangeroepen wanneer een snitch gelogd moet worden */
  onLogSnitch: (eventType: SnitchEventType) => Promise<void>;

  /** Aangeroepen wanneer gebruiker terugkeert na een overtreding */
  onShowReturnWarning: () => void;

  /** Of snitch detectie actief is (alleen wanneer sessie draait) */
  enabled?: boolean;

  /** Of deze gebruiker de host is (hosts worden niet getracked) */
  isHost?: boolean;
}

// Minimale drempel in seconden voor lock screen bescherming
// Dit is GEEN grace period - het is technische bescherming tegen false positives
const LOCK_SCREEN_PROTECTION_SECONDS = 5;

export function useSnitchDetector({
  onLogSnitch,
  onShowReturnWarning,
  enabled = true,
  isHost = false,
}: SnitchDetectorOptions) {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  
  // Tracking refs
  const backgroundAt = useRef<number | null>(null);
  const wasBackgrounded = useRef<boolean>(false);

  const handleAppStateChange = useCallback(async (nextState: AppStateStatus) => {
    const now = Date.now();
    const prevState = appState.current;

    // Sla verwerking over als uitgeschakeld of gebruiker is host
    if (!enabled || isHost) {
      appState.current = nextState;
      return;
    }

    console.log(`[SnitchDetector] State: ${prevState} → ${nextState}`);

    // ===== FASE 1: Naar achtergrond =====
    if (nextState === 'background' && prevState !== 'background') {
      backgroundAt.current = now;
      wasBackgrounded.current = true;
      console.log(`[SnitchDetector] Achtergrond op ${new Date(now).toISOString()}`);
    }

    // ===== FASE 2: Terug naar actief =====
    if (nextState === 'active' && wasBackgrounded.current && backgroundAt.current !== null) {
      const awaySeconds = (now - backgroundAt.current) / 1000;
      
      console.log(`[SnitchDetector] Terug na ${awaySeconds.toFixed(1)}s`);

      if (awaySeconds >= LOCK_SCREEN_PROTECTION_SECONDS) {
        console.log(`[SnitchDetector] OVERTREDING: weg ${awaySeconds.toFixed(1)}s >= ${LOCK_SCREEN_PROTECTION_SECONDS}s drempel`);
        
        // Log de snitch event - geen cooldown, elke overtreding telt
        try {
          await onLogSnitch('background_switch');
          console.log('[SnitchDetector] Overtreding gelogd');
        } catch (error) {
          console.error('[SnitchDetector] Overtreding loggen mislukt:', error);
        }
        
        // Toon terugkeer waarschuwing
        onShowReturnWarning();
      } else {
        console.log(`[SnitchDetector] Geen overtreding: ${awaySeconds.toFixed(1)}s < ${LOCK_SCREEN_PROTECTION_SECONDS}s (schermvergrendeling/opladen)`);
      }

      // Reset tracking
      wasBackgrounded.current = false;
      backgroundAt.current = null;
    }

    // Inactief → actief zonder achtergrond (snelle terugkeer)
    if (nextState === 'active' && prevState === 'inactive' && !wasBackgrounded.current) {
      console.log('[SnitchDetector] Snelle terugkeer van inactief - geen overtreding');
    }

    appState.current = nextState;
  }, [enabled, isHost, onLogSnitch, onShowReturnWarning]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  // Handmatige trigger voor sluitknop snitch
  const triggerCloseButtonSnitch = useCallback(async () => {
    if (!enabled || isHost) return;
    console.log('[SnitchDetector] Handmatige trigger: left_session');
    await onLogSnitch('left_session');
  }, [enabled, isHost, onLogSnitch]);

  return {
    isEnabled: enabled && !isHost,
    currentState: appState.current,
    triggerCloseButtonSnitch,
  };
}

export default useSnitchDetector;
