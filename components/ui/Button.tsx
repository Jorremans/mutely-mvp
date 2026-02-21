import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
}

export default function Button({ title, onPress, variant = 'primary', style, disabled = false }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button, 
        styles[variant], 
        style,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={[
        styles.text, 
        variant === 'secondary' && styles.secondaryText,
        variant === 'danger' && styles.dangerText,
        disabled && styles.disabledText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primary: {
    backgroundColor: '#00D36D',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00D36D',
  },
  danger: {
    backgroundColor: '#FF4444',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#121212',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryText: {
    color: '#00D36D',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledText: {
    opacity: 0.7,
  },
});
