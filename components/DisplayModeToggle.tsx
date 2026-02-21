/**
 * Weergavemodus Toggle Component
 * Laat de host schakelen tussen Vriendelijk en Savage weergavemodus
 * Beïnvloedt alleen tekst/copy, niet de logica
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DisplayMode } from './SnitchBanner';

interface DisplayModeToggleProps {
  mode: DisplayMode;
  onToggle: () => void;
}

export const DisplayModeToggle: React.FC<DisplayModeToggleProps> = ({
  mode,
  onToggle
}) => {
  const isSavage = mode === 'savage';

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.toggle, isSavage && styles.toggleSavage]}>
        <Ionicons 
          name={isSavage ? 'flame' : 'heart'} 
          size={14} 
          color={isSavage ? '#FF6B6B' : '#4CAF50'} 
        />
        <Text style={[styles.label, isSavage && styles.labelSavage]}>
          {isSavage ? 'Savage' : 'Vriendelijk'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  toggleSavage: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  labelSavage: {
    color: '#FF6B6B',
  },
});

export default DisplayModeToggle;
