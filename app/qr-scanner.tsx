import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { getSessionByCode } from '@/services/sessionService';

/**
 * QR Scanner Scherm
 * 
 * Scant QR-codes en haalt sessiecodes op uit verschillende formaten:
 * - Ruwe 6-cijferige code: "123456"
 * - HTTPS URL: "https://mutely.app/join?code=123456"
 * - Deep link: "mutely://join?code=123456"
 * 
 * Na succesvolle scan, navigeert naar consent scherm voor naaminvoer.
 */
export default function QRScannerScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  /**
   * Haal sessiecode op uit gescande data
   * Ondersteunt meerdere formaten:
   * - Ruwe code: "123456"
   * - URL met code parameter: "https://mutely.app/join?code=123456"
   * - Deep link: "mutely://join?code=123456"
   */
  const extractCodeFromData = (data: string): string | null => {
    // Check of het een ruwe 6-cijferige code is
    if (/^\d{6}$/.test(data)) {
      return data;
    }

    // Probeer code uit URL te halen
    try {
      let url: URL;
      
      if (data.startsWith('mutely://')) {
        url = new URL(data.replace('mutely://', 'https://mutely.app/'));
      } else if (data.startsWith('http://') || data.startsWith('https://')) {
        url = new URL(data);
      } else {
        return null;
      }

      const code = url.searchParams.get('code');
      if (code && /^\d{6}$/.test(code)) {
        return code;
      }

      const sessionId = url.searchParams.get('sessionId');
      if (sessionId) {
        return null;
      }
    } catch (e) {
      console.log('URL parsing mislukt:', e);
    }

    return null;
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    console.log('QR-data gescand:', data);

    const code = extractCodeFromData(data);

    if (code) {
      // Controleer of sessie bestaat
      const session = await getSessionByCode(code);

      if (!session) {
        Alert.alert(
          'Sessie niet gevonden',
          'Deze sessiecode bestaat niet of is verlopen.',
          [{ text: 'Opnieuw scannen', onPress: () => setScanned(false) }]
        );
        return;
      }

      if (session.status === 'ended') {
        Alert.alert(
          'Sessie beëindigd',
          'Deze sessie is al afgelopen.',
          [{ text: 'Opnieuw scannen', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Navigeer naar consent scherm met de code
      router.replace(`/consent?code=${code}&mode=guest`);
    } else {
      Alert.alert(
        'Ongeldige QR-code',
        'Deze QR-code bevat geen geldige Mutely sessiecode.\n\nZorg ervoor dat je de QR-code van een actieve Mutely sessie scant.',
        [{ text: 'Opnieuw scannen', onPress: () => setScanned(false) }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Camera-toegang aanvragen...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="camera-off" size={80} color="#FF6B6B" />
          <Text style={styles.title}>Geen cameratoegang</Text>
          <Text style={styles.message}>
            Geef de app toegang tot je camera om QR-codes te scannen.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Terug</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={32} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.overlay}>
          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              {/* Hoek indicatoren */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>
          
          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>Scan QR-code</Text>
            <Text style={styles.instructionText}>
              Richt de camera op de QR-code van de sessie-host
            </Text>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121212' 
  },
  camera: { 
    flex: 1 
  },
  closeButton: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    zIndex: 10, 
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  overlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scanAreaContainer: {
    padding: 20,
  },
  scanArea: {
    width: 260,
    height: 260,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00D36D',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructionBox: {
    marginTop: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 300,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 32 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFF', 
    marginTop: 24, 
    marginBottom: 16 
  },
  message: { 
    fontSize: 16, 
    color: '#CCC', 
    textAlign: 'center', 
    marginBottom: 32, 
    lineHeight: 24 
  },
  button: { 
    backgroundColor: '#00D36D', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 16 
  },
  buttonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#121212' 
  },
});
