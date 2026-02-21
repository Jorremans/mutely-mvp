import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import GradientBackground from '../components/GradientBackground';
import Card from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();

  const settingsItems = [
    { 
      icon: 'language', 
      title: 'Taal', 
      value: 'Nederlands',
      onPress: () => {
        Alert.alert('Taal', 'Nederlands is de enige beschikbare taal voor deze versie.');
      }
    },
    { 
      icon: 'information-circle', 
      title: 'Over Mutely', 
      onPress: () => Alert.alert(
        'Over Mutely\u00AE', 
        'We scrollen al genoeg. Mutely helpt ons om samen even te stoppen.\n\nVersie: 1.0.0 (MVP)'
      )
    },
    { 
      icon: 'shield-checkmark', 
      title: 'Privacy', 
      onPress: () => Alert.alert(
        'Privacy', 
        'Mutely verzamelt minimale, anonieme sessiedata voor focusanalyse. Je gegevens worden niet gedeeld met derden.'
      )
    },
    { 
      icon: 'document-text', 
      title: 'Gebruiksvoorwaarden', 
      onPress: () => Alert.alert(
        'Gebruiksvoorwaarden', 
        'Door Mutely te gebruiken ga je akkoord met onze gebruiksvoorwaarden. Bekijk de volledige voorwaarden op mutely.app/voorwaarden.'
      )
    },
    { 
      icon: 'mail', 
      title: 'Contact', 
      onPress: () => Alert.alert(
        'Contact', 
        'Heb je vragen of feedback?\n\nNeem contact op via:\nhello@mutely.app'
      )
    },
  ];

  return (
    <GradientBackground>
      <Image source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763416160824_903f4aac.png' }} style={styles.watermark} resizeMode="contain" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#121212" />
          </TouchableOpacity>
          <Text style={styles.title}>Instellingen</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            {settingsItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.item, index < settingsItems.length - 1 && styles.itemBorder]}
                onPress={item.onPress}
              >
                <View style={styles.itemLeft}>
                  <Ionicons name={item.icon as any} size={24} color="#00D36D" />
                  <Text style={styles.itemTitle}>{item.title}</Text>
                </View>
                {item.value && <Text style={styles.itemValue}>{item.value}</Text>}
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </Card>

          <Text style={styles.versionText}>Mutely v1.0.0 (MVP)</Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  watermark: { position: 'absolute', width: 300, height: 300, alignSelf: 'center', top: '35%', opacity: 0.12, zIndex: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, zIndex: 1 },
  backButton: { padding: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#121212' },
  placeholder: { width: 44 },
  scrollView: { flex: 1, zIndex: 1 },
  content: { padding: 32 },
  card: { width: '100%' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemTitle: { fontSize: 16, color: '#121212', marginLeft: 16 },
  itemValue: { fontSize: 14, color: '#666', marginRight: 8 },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 32,
  },
});
