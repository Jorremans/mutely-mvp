/**
 * Snitch Return Banner Component
 * 
 * Toont een waarschuwing wanneer de gebruiker terugkeert na een
 * achtergrondswitch (Snitch-overtreding).
 * 
 * Dit is de subtiele banner versie. De volledige overlay wordt
 * afgehandeld door BreakReturnOverlay.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SnitchReturnBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function SnitchReturnBanner({ visible, onDismiss }: SnitchReturnBannerProps) {
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in from top
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        hideAnimation();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // Reset position when not visible
      slideAnim.setValue(-150);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const hideAnimation = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={24} color="#E67E22" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.message}>
            Oeps, je was even weg. Dit telt als een Snitch-overtreding.
          </Text>
        </View>
        <TouchableOpacity onPress={hideAnimation} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    borderLeftWidth: 4,
    borderLeftColor: '#E67E22',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  closeButton: {
    padding: 8,
  },
});
