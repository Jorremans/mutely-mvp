import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import GradientBackground from '../components/GradientBackground';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { getSessionByCode } from '@/services/sessionService';

export default function JoinSessionScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (code.length !== 6) {
      Alert.alert('Ongeldige code', 'Voer een 6-cijferige sessiecode in.');
      return;
    }

    setLoading(true);
    try {
      // Check if session exists
      const session = await getSessionByCode(code);
      
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

      // Navigate to consent screen with the code
      router.push(`/consent?code=${code}&mode=guest`);
    } catch (error) {
      console.error('Error checking session:', error);
      Alert.alert('Fout', 'Er is iets misgegaan. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      {/* Watermark */}
      <Image
        source={{
          uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763759081415_4b7dbe8a.png'
        }}
        style={styles.watermark}
        resizeMode="contain"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={28} color="#121212" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>Deelnemen aan{'\n'}sessie</Text>

            {/* Scrollable Content */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.cardWrapper}>
                <Card style={styles.card}>

                  <Text style={styles.label}>Sessiecode</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Voer 6-cijferige code in"
                    placeholderTextColor="#888"
                    maxLength={6}
                    keyboardType="numeric"
                    value={code}
                    onChangeText={setCode}
                    returnKeyType="done"
                    editable={!loading}
                  />

                  <TouchableOpacity
                    style={[styles.scanButton, loading && styles.disabledButton]}
                    onPress={() => router.push('/qr-scanner')}
                    disabled={loading}
                  >
                    <Text style={styles.scanText}>QR-code scannen</Text>
                  </TouchableOpacity>

                  <Button
                    title={loading ? "Controleren..." : "Deelnemen"}
                    onPress={handleJoin}
                    style={styles.joinButton}
                    disabled={loading || code.length !== 6}
                  />

                  {loading && (
                    <ActivityIndicator 
                      size="small" 
                      color="#00D36D" 
                      style={styles.loader}
                    />
                  )}

                </Card>
              </View>
            </ScrollView>

          </SafeAreaView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 30,
  },

  watermark: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignSelf: 'center',
    top: 35,
    opacity: 0.45,
    zIndex: 0,
  },

  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 20,
    padding: 8
  },

  title: {
    position: 'absolute',
    top: 170,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#121212',
    zIndex: 10,
  },

  cardWrapper: {
    marginTop: 265,
  },

  card: {
    width: '100%',
    alignItems: 'center',
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 16,
  },

  input: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#121212',
    marginBottom: 20,
    textAlign: 'center',
  },

  scanButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#00D36D',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },

  disabledButton: {
    opacity: 0.5,
  },

  scanText: {
    textAlign: 'center',
    color: '#00D36D',
    fontSize: 16,
    fontWeight: '600',
  },

  joinButton: {
    width: '100%',
  },

  loader: {
    marginTop: 16,
  },
});
