import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LeaveSessionModalProps {
  visible: boolean;
  onCancel: () => void;
  onLeave: () => void;
}

/**
 * Sessie Verlaten Modal voor Deelnemers
 * 
 * Toont een bevestigingsdialoog wanneer een deelnemer op de sluitknop drukt.
 * Waarschuwt dat een Snitch-overtreding wordt geregistreerd.
 */
export default function LeaveSessionModal({ visible, onCancel, onLeave }: LeaveSessionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="exit-outline" size={48} color="#E74C3C" />
          </View>
          
          <Text style={styles.title}>Sessie verlaten?</Text>
          <Text style={styles.message}>
            Als je nu stopt of de app verlaat, wordt dit geregistreerd als een Snitch-overtreding. Weet je het zeker?
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.stayButton}
              onPress={onCancel}
            >
              <Text style={styles.stayButtonText}>Blijf in sessie</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.leaveButton}
              onPress={onLeave}
            >
              <Text style={styles.leaveButtonText}>Toch verlaten</Text>
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
  stayButton: {
    backgroundColor: '#00D36D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stayButtonText: {
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
