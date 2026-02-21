/**
 * Snitch Banner Component
 * Toont een slide-in melding wanneer iemand de stilte verbreekt tijdens een sessie
 * 
 * Weergavemodi:
 * - Vriendelijk (standaard): "Jordy heeft de stilte verlaten (na 05:20)"
 * - Savage: "Jordy hield het niet langer vol (na 05:20)"
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type DisplayMode = 'friendly' | 'savage';

interface SnitchBannerProps {
  name: string;
  visible: boolean;
  isHost: boolean;
  displayMode?: DisplayMode;
  durationStayed?: string; // mm:ss format
  onHide: () => void;
}

const { width } = Dimensions.get('window');

export const SnitchBanner: React.FC<SnitchBannerProps> = ({
  name,
  visible,
  isHost,
  displayMode = 'friendly',
  durationStayed,
  onHide
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        hideAnimation();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideAnimation = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  // Bericht op basis van weergavemodus
  const getMessage = () => {
    const timeStr = durationStayed ? ` (na ${durationStayed})` : '';
    
    if (displayMode === 'savage') {
      return `${name} hield het niet langer vol${timeStr}`;
    }
    // Vriendelijke modus (standaard)
    return `${name} heeft de stilte verlaten${timeStr}`;
  };

  const message = getMessage();
  const backgroundColor = '#FF6B6B';
  const iconName = 'exit-outline';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.redDot} />
        <Ionicons name={iconName} size={24} color="#FFF" style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C0392B',
    marginRight: 8,
  },
  icon: {
    marginRight: 12
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    lineHeight: 20
  }
});

export default SnitchBanner;
