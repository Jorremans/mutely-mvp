import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import GradientBackground from '../components/GradientBackground';
import Button from '../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

const ROTATING_QUOTES = [
  'Omdat de mensen naast je leuker zijn dan je scherm',
  'Geen bereik, wel connectie.',
  'Minder scherm, meer samen.',
  'Jullie moment. Zonder meldingen.',
  'Echte aandacht. Echte verbinding.',
  'Geef je telefoon even pauze, jullie hebben elkaar',
  'Focus zonder afleiding.',
  'Samen zijn zonder schermen.',
  'Offline is het nieuwe luxe.',
  'Let op elkaar, niet op je scherm.',
  'Geen socials, maar sociaal',
];

const QUOTE_INTERVAL = 4000; // 4 seconds per quote
const FADE_DURATION = 600;   // 600ms fade transition

export default function HomeScreen() {
  const router = useRouter();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const cycleQuote = useCallback(() => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      // Update text while invisible
      setQuoteIndex((prev) => (prev + 1) % ROTATING_QUOTES.length);
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  useEffect(() => {
    const interval = setInterval(cycleQuote, QUOTE_INTERVAL);
    return () => clearInterval(interval);
  }, [cycleQuote]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>

        {/* Settings button */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={28} color="#0A2D47" />
        </TouchableOpacity>

        {/* Logo – Mutely® */}
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1771527294438_fe36634e.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Tekstblok (tagline + rotating quote) */}
        <View style={styles.textBlock}>
          <Text style={styles.tagline}>
            Telefoons uit, gezelligheid aan!
          </Text>

          {/* Fixed-height wrapper prevents layout shift */}
          <View style={styles.quoteWrapper}>
            <Animated.Text
              style={[styles.quote, { opacity: fadeAnim }]}
              numberOfLines={2}
            >
              {`\u201C${ROTATING_QUOTES[quoteIndex]}\u201D`}
            </Animated.Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.content}>
          <View style={styles.buttonContainer}>
            <Button
              title="Sessie starten"
              onPress={() => router.push('/create-session')}
              style={styles.button}
            />
            <Button
              title="Deelnemen aan sessie"
              onPress={() => router.push('/join-session')}
              variant="secondary"
              style={styles.button}
            />
          </View>
        </View>

      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Settings icon */
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },

  /* Logo styling */
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    writingDirection: 'ltr',
    direction: 'ltr',
  },
  logo: {
    width: 180,
    height: 180,
  },

  /* Tagline */
  tagline: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0A2D47',
    textAlign: 'center',
    marginTop: 32,
    writingDirection: 'ltr',
    direction: 'ltr',
  },

  /* Fixed-height quote wrapper – prevents layout shift */
  quoteWrapper: {
    width: '100%',
    height: 52,            // enough for 2 lines at fontSize 16
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    overflow: 'hidden',
  },

  /* Quote */
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#0A2D47',
    opacity: 0.7,
    textAlign: 'center',
    maxWidth: 260,
    paddingHorizontal: 12,
    writingDirection: 'ltr',
    direction: 'ltr',
  },

  textBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },


  /* Buttons */
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    writingDirection: 'ltr',
    direction: 'ltr',
  },

  buttonContainer: {
    width: '100%',
    gap: 16,
    marginTop: 40,
  },

  button: {
    width: '100%',
  },
});
