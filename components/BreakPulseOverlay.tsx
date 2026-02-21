/**
 * Break Pulse Overlay
 * 
 * Subtiele rode overlay die kort verschijnt wanneer iemand de stilte verbreekt.
 * Duur: 300-500ms fade in/out.
 * Elegant en minimaal - geen agressieve animaties.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';

interface BreakPulseOverlayProps {
  visible: boolean;
  onComplete: () => void;
}

export default function BreakPulseOverlay({ visible, onComplete }: BreakPulseOverlayProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in (300ms) → hold briefly → fade out (400ms)
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.15,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
      });
    } else {
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: opacityAnim },
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E74C3C',
    zIndex: 500,
  },
});
