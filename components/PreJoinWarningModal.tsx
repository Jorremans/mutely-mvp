import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Module-level flag to remember "don't show again" within app session
let _dontShowAgain = false;

export function shouldShowPreJoinWarning(): boolean {
  return !_dontShowAgain;
}

interface PreJoinWarningModalProps {
  visible: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export default function PreJoinWarningModal({ visible, onAccept, onCancel }: PreJoinWarningModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleAccept = () => {
    if (dontShowAgain) {
      _dontShowAgain = true;
    }
    onAccept();
  };

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
            <Ionicons name="information-circle" size={48} color="#0A2D47" />
          </View>

          <Text style={styles.title}>Belangrijk</Text>
          <Text style={styles.message}>
            Als je tijdens de sessie de app wegschuift of naar de achtergrond gaat, telt dit als een Snitch-overtreding. Blijf in Mutely tot de sessie is afgelopen.
          </Text>

          {/* Don't show again toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setDontShowAgain(!dontShowAgain)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={dontShowAgain ? 'checkbox' : 'square-outline'}
              size={22}
              color="#00D36D"
            />
            <Text style={styles.toggleText}>Niet opnieuw tonen</Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>Ik snap het</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Annuleren</Text>
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
    backgroundColor: 'rgba(10, 45, 71, 0.08)',
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
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#00D36D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
