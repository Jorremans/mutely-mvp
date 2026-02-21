import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GradientBackground from '../components/GradientBackground';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { createSession, joinSession } from '@/services/sessionService';

type GuestStep = 'name' | 'commitment' | 'ritual';

export default function ConsentScreen() {
  const router = useRouter();
  const { code, mode } = useLocalSearchParams();

  // Shared state
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);

  // Host-only state
  const [sessionName, setSessionName] = useState('');
  const [duration, setDuration] = useState('30');
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [agree3, setAgree3] = useState(false);

  // Guest multi-step state
  const [guestStep, setGuestStep] = useState<GuestStep>('name');

  const isHost = mode === 'host';

  // =============================================
  // HOST FLOW
  // =============================================
  const handleHostStart = async () => {
    if (!firstName.trim()) {
      Alert.alert('Vereist veld', 'Voer je voornaam in.');
      return;
    }
    if (!sessionName.trim()) {
      Alert.alert('Vereist veld', 'Voer een sessienaam in.');
      return;
    }
    if (!agree1 || !agree2 || !agree3) {
      Alert.alert('Akkoord vereist', 'Je moet akkoord gaan met alle voorwaarden.');
      return;
    }

    setLoading(true);
    try {
      const result = await createSession(
        firstName.trim(),
        sessionName.trim(),
        parseInt(duration) || 30
      );

      if (!result) {
        Alert.alert('Fout', 'Kon sessie niet aanmaken. Probeer opnieuw.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        code: result.code,
        sessionId: result.sessionId,
        participantId: result.hostId,
        name: firstName.trim(),
        session: sessionName.trim(),
        duration: duration,
        isHost: 'true',
      });

      router.push(`/session-admin?${params.toString()}`);
    } catch (error) {
      console.error('Error in handleHostStart:', error);
      Alert.alert('Fout', 'Er is iets misgegaan. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // GUEST FLOW - STEP 1: NAME INPUT
  // =============================================
  const handleGuestNameSubmit = () => {
    if (!firstName.trim()) {
      Alert.alert('Vereist veld', 'Voer je voornaam in.');
      return;
    }
    // Geen sessie registratie - alleen naar volgende stap
    setGuestStep('commitment');
  };

  // =============================================
  // GUEST FLOW - STEP 2: COMMITMENT
  // =============================================
  const handleCommitmentAccept = () => {
    // Geen sessie registratie - alleen naar volgende stap
    setGuestStep('ritual');
  };

  const handleCommitmentDecline = () => {
    router.back();
  };

  // =============================================
  // GUEST FLOW - STEP 3: RITUAL (SILENT MODE)
  // =============================================
  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:root=NOTIFICATIONS_ID');
    } else {
      Linking.openSettings();
    }
  };

  const handlePhoneSilent = async () => {
    // NU pas registreren we de deelnemer
    setLoading(true);
    try {
      const result = await joinSession(code as string, firstName.trim());

      if (!result) {
        Alert.alert('Fout', 'Kon niet deelnemen aan sessie. Controleer de code.');
        setLoading(false);
        return;
      }

      // Navigeer naar wachtkamer - sessie heartbeat start nu
      const params = new URLSearchParams({
        code: code as string,
        sessionId: result.sessionId,
        participantId: result.participantId,
        name: firstName.trim(),
        session: result.session.session_name || 'Focus Sessie',
        duration: result.session.duration_minutes.toString(),
        isHost: 'false',
      });

      router.push(`/session-waiting?${params.toString()}`);
    } catch (error) {
      console.error('Error in handlePhoneSilent:', error);
      Alert.alert('Fout', 'Er is iets misgegaan. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // RENDER: HOST MODE
  // =============================================
  if (isHost) {
    return (
      <GradientBackground>
        <Image
          source={{
            uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763759081415_4b7dbe8a.png',
          }}
          style={styles.watermark}
          resizeMode="contain"
        />
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Welkom bij Mutely</Text>
            <Text style={styles.subtitle}>
              <Text style={{ fontStyle: 'italic' }}>
                Geef je gezelschap even alle aandacht
              </Text>
            </Text>

            <Card style={styles.card}>
              <Text style={styles.label}>Voornaam *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Je voornaam"
                placeholderTextColor="#999"
                editable={!loading}
              />

              <Text style={styles.label}>Sessienaam *</Text>
              <TextInput
                style={styles.input}
                value={sessionName}
                onChangeText={setSessionName}
                placeholder="Bijv. Team Focus"
                placeholderTextColor="#999"
                editable={!loading}
              />
              <Text style={styles.label}>Duur (minuten) *</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholderTextColor="#999"
                editable={!loading}
              />

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setAgree1(!agree1)}
                  disabled={loading}
                >
                  <Ionicons
                    name={agree1 ? 'checkbox' : 'square-outline'}
                    size={24}
                    color="#00D36D"
                  />
                  <Text style={styles.checkboxText}>Ik doe mee</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setAgree2(!agree2)}
                  disabled={loading}
                >
                  <Ionicons
                    name={agree2 ? 'checkbox' : 'square-outline'}
                    size={24}
                    color="#00D36D"
                  />
                  <Text style={styles.checkboxText}>Ik begrijp de regels</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setAgree3(!agree3)}
                  disabled={loading}
                >
                  <Ionicons
                    name={agree3 ? 'checkbox' : 'square-outline'}
                    size={24}
                    color="#00D36D"
                  />
                  <Text style={styles.checkboxText}>Privacyvoorwaarden</Text>
                </TouchableOpacity>
              </View>

              <Button
                title={loading ? 'Even geduld...' : 'Sessie starten'}
                onPress={handleHostStart}
                disabled={loading}
              />

              {loading && (
                <ActivityIndicator
                  size="small"
                  color="#00D36D"
                  style={styles.loader}
                />
              )}

              <Button
                title="Annuleren"
                onPress={() => router.back()}
                variant="secondary"
                style={{ marginTop: 12 }}
                disabled={loading}
              />
            </Card>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // =============================================
  // RENDER: GUEST MODE - STEP 1: NAME INPUT
  // =============================================
  if (guestStep === 'name') {
    return (
      <GradientBackground>
        <Image
          source={{
            uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763759081415_4b7dbe8a.png',
          }}
          style={styles.watermark}
          resizeMode="contain"
        />
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Deelnemen</Text>
            <Text style={styles.subtitle}>
              <Text style={{ fontStyle: 'italic' }}>
                Voer je naam in om deel te nemen aan de sessie
              </Text>
            </Text>

            <Card style={styles.card}>
              <Text style={styles.label}>Voornaam *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Je voornaam"
                placeholderTextColor="#999"
                autoFocus
              />

              <Button
                title="Deelnemen"
                onPress={handleGuestNameSubmit}
              />

              <Button
                title="Annuleren"
                onPress={() => router.back()}
                variant="secondary"
                style={{ marginTop: 12 }}
              />
            </Card>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // =============================================
  // RENDER: GUEST MODE - STEP 2: COMMITMENT
  // =============================================
  if (guestStep === 'commitment') {
    return (
      <GradientBackground>
        <Image
          source={{
            uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763759081415_4b7dbe8a.png',
          }}
          style={styles.watermark}
          resizeMode="contain"
        />
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.stepContent}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="hand-left-outline" size={48} color="#0A2D47" />
              </View>

              <Text style={styles.stepTitle}>Commitment aan stilte</Text>
              <Text style={styles.stepMessage}>
                Het verlaten van de app of het gebruiken van andere apps wordt zichtbaar voor de groep.
              </Text>

              <View style={styles.stepButtonContainer}>
                <TouchableOpacity
                  style={styles.primaryStepButton}
                  onPress={handleCommitmentAccept}
                >
                  <Text style={styles.primaryStepButtonText}>IK DOE MEE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryStepButton}
                  onPress={handleCommitmentDecline}
                >
                  <Text style={styles.secondaryStepButtonText}>Toch niet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // =============================================
  // RENDER: GUEST MODE - STEP 3: RITUAL (SILENT MODE)
  // =============================================
  return (
    <GradientBackground>
      <Image
        source={{
          uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763759081415_4b7dbe8a.png',
        }}
        style={styles.watermark}
        resizeMode="contain"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.stepContent}>
            <View style={styles.stepIconContainer}>
              <Ionicons name="volume-mute-outline" size={48} color="#0A2D47" />
            </View>

            <Text style={styles.stepTitle}>
              Zet je telefoon op stil of Focus
            </Text>
            <Text style={styles.stepMessage}>
              Gebruik de zijknop of activeer 'Niet storen'. Kom daarna terug naar Mutely.
            </Text>

            <View style={styles.stepButtonContainer}>
              <TouchableOpacity
                style={styles.outlineStepButton}
                onPress={handleOpenSettings}
              >
                <Ionicons name="settings-outline" size={20} color="#0A2D47" />
                <Text style={styles.outlineStepButtonText}>Open instellingen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryStepButton, loading && styles.disabledButton]}
                onPress={handlePhoneSilent}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#121212" />
                ) : (
                  <Text style={styles.primaryStepButtonText}>
                    Mijn telefoon staat stil
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  watermark: {
    position: 'absolute',
    width: 240,
    height: 240,
    alignSelf: 'center',
    top: '1%',
    opacity: 0.3,
    zIndex: 0,
  },
  scrollContent: { padding: 32, paddingTop: 60, zIndex: 1, flexGrow: 1 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#121212',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#121212',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  card: { width: '100%' },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
    color: '#121212',
  },
  checkboxContainer: { marginVertical: 16 },
  checkbox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkboxText: { marginLeft: 12, fontSize: 16, color: '#121212' },
  loader: { marginTop: 16 },

  // Multi-step guest flow styles
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  stepIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(10, 45, 71, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#121212',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 34,
  },
  stepMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
    paddingHorizontal: 8,
  },
  stepButtonContainer: {
    width: '100%',
    gap: 14,
  },
  primaryStepButton: {
    backgroundColor: '#00D36D',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryStepButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#121212',
    letterSpacing: 0.5,
  },
  secondaryStepButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryStepButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  outlineStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A2D47',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  outlineStepButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2D47',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
