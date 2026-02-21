/**
 * Break Return Overlay
 * 
 * Getoond wanneer een deelnemer terugkeert na het verlaten van de app.
 * Toont een bericht dat de stilte is verbroken met twee opties:
 * - Terug naar sessie (blijf in sessie, maar gemarkeerd als verbroken)
 * - Sessie verlaten (verlaat de sessie volledig)
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BreakReturnOverlayProps {
  visible: boolean;
  onReturnToSession: () => void;
  onLeaveSession: () => void;
}

export default function BreakReturnOverlay({
  visible,
  onReturnToSession,
  onLeaveSession,
}: BreakReturnOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onReturnToSession}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          </View>

          <Text style={styles.title}>Stilte verbroken</Text>
          <Text style={styles.message}>
            Je hebt de stilte verlaten. Je streak is verbroken.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.returnButton}
              onPress={onReturnToSession}
            >
              <Text style={styles.returnButtonText}>Terug naar sessie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leaveButton}
              onPress={onLeaveSession}
            >
              <Text style={styles.leaveButtonText}>Sessie verlaten</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#121212',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#555',
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  returnButton: {
    backgroundColor: '#00D36D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  returnButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  leaveButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
