import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GradientBackground from '../components/GradientBackground';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { getSessionByCode } from '@/services/sessionService';

/**
 * Deelnemen scherm - verwerkt deep links van QR-codes
 * 
 * Accepteert:
 * - mutely://join?code=123456
 * - https://mutely.app/join?code=123456
 * 
 * Routeert naar:
 * - Consent scherm (voor naaminvoer) -> dan naar juiste wacht-/live scherm
 */
export default function JoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; sessionId?: string }>();
  
  const [code, setCode] = useState(params.code || '');
  const [loading, setLoading] = useState(false);
  const [autoJoining, setAutoJoining] = useState(false);

  // Automatisch deelnemen als code via deep link is meegegeven
  useEffect(() => {
    const codeFromParams = params.code?.replace(/-/g, ''); // Verwijder streepjes indien geformateerd
    if (codeFromParams && codeFromParams.length === 6) {
      setCode(codeFromParams);
      handleAutoJoin(codeFromParams);
    }
  }, [params.code]);

  const handleAutoJoin = async (joinCode: string) => {
    setAutoJoining(true);
    try {
      const session = await getSessionByCode(joinCode);
      
      if (!session) {
        Alert.alert(
          'Sessie niet gevonden',
          'Deze sessiecode bestaat niet of is verlopen.',
          [{ text: 'OK', onPress: () => setAutoJoining(false) }]
        );
        return;
      }

      if (session.status === 'ended') {
        Alert.alert(
          'Sessie beëindigd',
          'Deze sessie is al afgelopen.',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
        return;
      }

      // Navigeer naar consent scherm voor naaminvoer
      router.replace(`/consent?code=${joinCode}&mode=guest`);
    } catch (error) {
      console.error('Automatisch deelnemen fout:', error);
      Alert.alert(
        'Fout',
        'Er is iets misgegaan bij het deelnemen. Probeer opnieuw.',
        [{ text: 'OK', onPress: () => setAutoJoining(false) }]
      );
    }
  };

  const handleManualJoin = async () => {
    const cleanCode = code.replace(/-/g, '').trim();
    
    if (cleanCode.length !== 6) {
      Alert.alert('Ongeldige code', 'Voer een 6-cijferige sessiecode in.');
      return;
    }

    setLoading(true);
    try {
      const session = await getSessionByCode(cleanCode);
      
      if (!session) {
        Alert.alert('Sessie niet gevonden', 'Controleer de code en probeer opnieuw.');
        setLoading(false);
        return;
      }

      if (session.status === 'ended') {
        Alert.alert('Sessie beëindigd', 'Deze sessie is al afgelopen.');
        setLoading(false);
        return;
      }

      // Navigeer naar consent scherm voor naaminvoer
      router.replace(`/consent?code=${cleanCode}&mode=guest`);
    } catch (error) {
      console.error('Handmatig deelnemen fout:', error);
      Alert.alert('Fout', 'Er is iets misgegaan. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  // Toon laadscherm tijdens automatisch deelnemen
  if (autoJoining) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00D36D" />
            <Text style={styles.loadingText}>Sessie laden...</Text>
            <Text style={styles.loadingSubtext}>Code: {code}</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Toon handmatig invoerformulier als geen code of automatisch deelnemen mislukt
  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <View style={styles.content}>
              <Text style={styles.title}>Deelnemen aan sessie</Text>
              <Text style={styles.subtitle}>
                Voer de sessiecode in om deel te nemen
              </Text>

              <Card style={styles.card}>
                <Text style={styles.label}>Sessiecode</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="123456"
                  placeholderTextColor="#999"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="numeric"
                  maxLength={7} // Sta streepje toe: 123-456
                  autoFocus={!params.code}
                  editable={!loading}
                />

                <Button
                  title={loading ? 'Controleren...' : 'Deelnemen'}
                  onPress={handleManualJoin}
                  disabled={loading || code.replace(/-/g, '').length !== 6}
                  style={styles.button}
                />

                <Button
                  title="Terug naar home"
                  onPress={() => router.replace('/')}
                  variant="secondary"
                  style={styles.backButton}
                />
              </Card>
            </View>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#121212',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: '600',
    color: '#121212',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 4,
  },
  button: {
    width: '100%',
  },
  backButton: {
    width: '100%',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#121212',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
