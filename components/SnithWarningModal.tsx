import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Button from './ui/Button';

interface SnithWarningModalProps {
  visible: boolean;
  onStay: () => void;
  onLeave: () => void;
}

/**
 * Host Sessie Beëindigen Modal
 * 
 * Toont een bevestigingsdialoog wanneer de host de sessie wil beëindigen.
 */
export default function SnithWarningModal({ visible, onStay, onLeave }: SnithWarningModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onStay}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Sessie beëindigen?</Text>
          <Text style={styles.message}>
            Weet je zeker dat je de sessie wilt beëindigen? Alle deelnemers worden afgesloten.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Doorgaan met sessie"
              onPress={onStay}
              style={styles.button}
            />
            <Button
              title="Sessie beëindigen"
              onPress={onLeave}
              variant="danger"
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#121212',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    width: '100%',
  },
});
