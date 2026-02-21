import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GradientBackground from '../components/GradientBackground';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { getSessionSummary, getSnitchEvents, getSessionById, Participant, SnitchEvent, Session } from '@/services/sessionService';

interface ParticipantSummary {
  participant: Participant;
  breakEvents: {
    durationStayed: string; // mm:ss - hoe lang in sessie voor overtreding
    returnedAfter?: string; // mm:ss - hoe lang weg voor terugkeer (indien van toepassing)
  }[];
}

export default function SessionSummaryScreen() {
  const router = useRouter();
  const { sessionId, duration } = useLocalSearchParams();
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantSummaries, setParticipantSummaries] = useState<ParticipantSummary[]>([]);
  const [totalSnitches, setTotalSnitches] = useState(0);
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);

  const emojis = [
    { emoji: '😊', label: 'Goed' },
    { emoji: '😐', label: 'Neutraal' },
    { emoji: '😣', label: 'Moeilijk' }
  ];

  useEffect(() => {
    loadSummary();
  }, [sessionId]);

  const formatDuration = (startMs: number, endMs: number): string => {
    const durationMs = endMs - startMs;
    if (durationMs < 0) return '00:00';
    
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadSummary = async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      const summary = await getSessionSummary(sessionId as string);
      if (summary) {
        setParticipants(summary.participants);
        setSessionInfo(summary.session);
        
        const total = summary.participants.reduce((sum, p) => sum + p.snitch_count, 0);
        setTotalSnitches(total);

        // Bouw gedetailleerde samenvattingen per deelnemer
        const sessionStartedAt = summary.session.started_at 
          ? new Date(summary.session.started_at).getTime() 
          : 0;

        const summaries: ParticipantSummary[] = summary.participants.map(p => {
          // Filter events voor deze deelnemer (alleen break events)
          const participantEvents = summary.events
            .filter(e => 
              e.participant_id === p.id && 
              (e.event_type === 'left_session' || e.event_type === 'background_switch')
            )
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          const breakEvents = participantEvents.map((event, index) => {
            const eventTime = new Date(event.created_at).getTime();
            const durationStayed = formatDuration(sessionStartedAt, eventTime);
            
            // Kijk of er een volgend event is (= terugkeer indicatie)
            // Als er een volgend event is, berekenen we de tijd ertussen als "terugkeer"
            let returnedAfter: string | undefined;
            if (index < participantEvents.length - 1) {
              const nextEventTime = new Date(participantEvents[index + 1].created_at).getTime();
              returnedAfter = formatDuration(eventTime, nextEventTime);
            }
            
            return { durationStayed, returnedAfter };
          });

          return { participant: p, breakEvents };
        });

        setParticipantSummaries(summaries);
      }
    } catch (error) {
      console.error('Fout bij laden samenvatting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    router.replace('/');
  };

  // Sorteer op aantal overtredingen (laagste eerst)
  const sortedSummaries = [...participantSummaries].sort(
    (a, b) => a.participant.snitch_count - b.participant.snitch_count
  );

  const mostFocused = sortedSummaries.length > 0 ? sortedSummaries[0] : null;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Image
              source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763416160824_903f4aac.png' }}
              style={styles.watermark}
              resizeMode="contain"
            />
            
            <Card style={styles.card}>
              <Text style={styles.title}>Sessie voltooid!</Text>
              <Text style={styles.duration}>{duration} minuten focus</Text>

              {loading ? (
                <ActivityIndicator size="large" color="#00D36D" style={styles.loader} />
              ) : (
                <>
                  {/* Statistieken Overzicht */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                      <Ionicons name="people" size={24} color="#00D36D" />
                      <Text style={styles.statNumber}>{participants.length}</Text>
                      <Text style={styles.statLabel}>Deelnemers</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Ionicons name="warning" size={24} color="#FF6B6B" />
                      <Text style={styles.statNumber}>{totalSnitches}</Text>
                      <Text style={styles.statLabel}>Overtredingen</Text>
                    </View>
                  </View>

                  {/* Meest Gefocust Award */}
                  {mostFocused && mostFocused.participant.snitch_count === 0 && (
                    <View style={styles.awardContainer}>
                      <Ionicons name="trophy" size={32} color="#FFD700" />
                      <Text style={styles.awardTitle}>Meest gefocust</Text>
                      <Text style={styles.awardName}>{mostFocused.participant.name}</Text>
                      <Text style={styles.awardSubtext}>Geen enkele overtreding!</Text>
                    </View>
                  )}

                  {/* Resultaten per Deelnemer */}
                  <View style={styles.resultsContainer}>
                    <Text style={styles.resultsTitle}>Resultaten per deelnemer</Text>
                    {sortedSummaries.map((summary, index) => (
                      <View key={summary.participant.id} style={styles.participantResult}>
                        <View style={styles.participantHeader}>
                          <View style={styles.participantInfoRow}>
                            <Text style={styles.participantRank}>#{index + 1}</Text>
                            <Text style={styles.participantName}>
                              {summary.participant.name}
                              {summary.participant.role === 'host' && ' (Host)'}
                            </Text>
                          </View>
                          <View style={styles.snitchBadge}>
                            <Ionicons 
                              name={summary.participant.snitch_count === 0 ? "checkmark-circle" : "alert-circle"} 
                              size={18} 
                              color={summary.participant.snitch_count === 0 ? "#00D36D" : "#FF6B6B"} 
                            />
                            <Text style={[
                              styles.snitchCount,
                              { color: summary.participant.snitch_count === 0 ? "#00D36D" : "#FF6B6B" }
                            ]}>
                              {summary.participant.snitch_count} overtreding{summary.participant.snitch_count !== 1 ? 'en' : ''}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Gedetailleerde break events */}
                        {summary.breakEvents.length > 0 && (
                          <View style={styles.breakEventsContainer}>
                            {summary.breakEvents.map((breakEvent, bIndex) => (
                              <View key={bIndex} style={styles.breakEventRow}>
                                <View style={styles.breakEventDot} />
                                <View style={styles.breakEventTextContainer}>
                                  <Text style={styles.breakEventText}>
                                    Stilte verbroken na {breakEvent.durationStayed}
                                  </Text>
                                  {breakEvent.returnedAfter && (
                                    <Text style={styles.returnEventText}>
                                      Teruggekeerd na {breakEvent.returnedAfter}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </>
              )}
              
              {/* Feedback Sectie */}
              <View style={styles.feedbackSection}>
                <Text style={styles.label}>Hoe voel je je?</Text>
                <View style={styles.emojiContainer}>
                  {emojis.map((item) => (
                    <TouchableOpacity
                      key={item.emoji}
                      style={[
                        styles.emojiButton,
                        selectedEmoji === item.emoji && styles.emojiSelected
                      ]}
                      onPress={() => setSelectedEmoji(item.emoji)}
                    >
                      <Text style={styles.emoji}>{item.emoji}</Text>
                      <Text style={styles.emojiLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Notities (optioneel)</Text>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Schrijf je gedachten op..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <Button
                title="Klaar"
                onPress={handleFinish}
                style={styles.button}
              />
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 20 },
  watermark: { position: 'absolute', width: 300, height: 300, opacity: 0.12 },

  card: { width: '100%', zIndex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#121212', marginBottom: 8, textAlign: 'center' },
  duration: { fontSize: 20, color: '#00D36D', marginBottom: 24, textAlign: 'center', fontWeight: '600' },
  
  loader: { marginVertical: 40 },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#121212',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  awardContainer: {
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  awardTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  awardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#121212',
    marginTop: 4,
  },
  awardSubtext: {
    fontSize: 12,
    color: '#00D36D',
    marginTop: 4,
  },

  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 12,
  },
  participantResult: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginRight: 12,
    width: 24,
  },
  participantName: {
    fontSize: 14,
    color: '#121212',
    fontWeight: '500',
  },
  snitchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snitchCount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Break event details
  breakEventsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  breakEventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  breakEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E74C3C',
    marginTop: 6,
    marginRight: 8,
  },
  breakEventTextContainer: {
    flex: 1,
  },
  breakEventText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  returnEventText: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 1,
  },

  feedbackSection: {
    marginTop: 8,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#121212', marginBottom: 12, marginTop: 8 },
  emojiContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  emojiButton: { alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#F5F5F5' },
  emojiSelected: { backgroundColor: '#00D36D', opacity: 0.3 },
  emoji: { fontSize: 36, marginBottom: 4 },
  emojiLabel: { fontSize: 12, color: '#121212' },
  textArea: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 24, color: '#121212' },
  button: { width: '100%' },
});
