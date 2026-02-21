import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GradientBackground from '../components/GradientBackground';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SnitchBanner from '../components/SnitchBanner';
import { useSessionRealtime } from '@/hooks/useSessionRealtime';
import {
  getParticipants,
  getSessionById,
  leaveSession,
  Participant,
  Session,
} from '@/services/sessionService';

/**
 * Wachtkamer voor Deelnemers
 * 
 * Dit scherm is ALLEEN voor deelnemers (gasten), NIET voor hosts.
 */
export default function SessionWaitingScreen() {
  const router = useRouter();
  const { code, sessionId, participantId, name, session, duration, isHost } =
    useLocalSearchParams();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [snitchBanner, setSnitchBanner] = useState<{ visible: boolean; name: string }>({
    visible: false,
    name: '',
  });

  // Map voor realtime hook
  const participantsMapRef = useRef(new Map<string, Participant>());

  useEffect(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    participantsMapRef.current = map;
  }, [participants]);

  // Init load
  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    if (!sessionId) return;

    const [participantsData, sessionInfo] = await Promise.all([
      getParticipants(sessionId as string),
      getSessionById(sessionId as string),
    ]);

    setParticipants(participantsData);
    setSessionData(sessionInfo);

    if (sessionInfo?.status === 'running') {
      navigateToLive();
    }
  };

  const navigateToLive = () => {
    router.replace(
      `/session-live?code=${code}&sessionId=${sessionId}&participantId=${participantId}` +
        `&name=${name}&duration=${duration}&isHost=${isHost}`,
    );
  };

  // Realtime callbacks
  const handleParticipantJoin = useCallback((participant: Participant) => {
    setParticipants((prev) =>
      prev.find((p) => p.id === participant.id) ? prev : [...prev, participant],
    );
  }, []);

  const handleParticipantLeave = useCallback((participant: Participant) => {
    setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
  }, []);

  const handleSessionStart = useCallback(
    (s: Session) => {
      if (s.status === 'running') {
        navigateToLive();
      }
    },
    [code, sessionId, participantId, name, duration, isHost],
  );

  const handleSessionEnd = useCallback(() => {
    Alert.alert('Sessie beëindigd', 'De host heeft de sessie beëindigd.');
    router.replace('/');
  }, []);

  const handleSnitchEvent = useCallback(
    (event: any, participantName: string) => {
      if (event.participant_id === participantId) return;
      setSnitchBanner({ visible: true, name: participantName });
    },
    [participantId],
  );

  useSessionRealtime({
    sessionId: sessionId as string,
    callbacks: {
      onParticipantJoin: handleParticipantJoin,
      onParticipantLeave: handleParticipantLeave,
      onSessionStart: handleSessionStart,
      onSessionEnd: handleSessionEnd,
      onSnitchEvent: handleSnitchEvent,
    },
    participantsMap: participantsMapRef.current,
  });

  const handleLeave = async () => {
    Alert.alert(
      'Sessie verlaten?',
      'Weet je zeker dat je de sessie wilt verlaten?',
      [
        { text: 'Blijf in sessie', style: 'cancel' },
        {
          text: 'Toch verlaten',
          style: 'destructive',
          onPress: async () => {
            await leaveSession(participantId as string);
            router.replace('/');
          },
        },
      ]
    );
  };

  const hostParticipant = participants.find((p) => p.role === 'host');
  const hostName = hostParticipant?.name || 'Host';
  const sessionName = session || sessionData?.session_name || 'Focus Sessie';
  const sessionDuration = duration || sessionData?.duration_minutes;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <SnitchBanner
          name={snitchBanner.name}
          visible={snitchBanner.visible}
          isHost={isHost === 'true'}
          onHide={() => setSnitchBanner({ visible: false, name: '' })}
        />

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.content}>
            <Image
              source={{
                uri: 'https://d64gsuwffb70l.cloudfront.net/686d5a4b47ae519b1741842d_1763416160824_903f4aac.png',
              }}
              style={styles.watermark}
              resizeMode="contain"
            />

            <Card style={styles.card}>
              <Text style={styles.title}>Wachtkamer</Text>

              <Text style={styles.sessionName}>{sessionName}</Text>

              {/* Sessie-informatie */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Host:</Text>
                  <Text style={styles.infoValue}>{hostName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Duur:</Text>
                  <Text style={styles.infoValue}>{sessionDuration} minuten</Text>
                </View>
              </View>

              {/* Wachtstatus */}
              <View style={styles.waitingContainer}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Wachten op host</Text>
                </View>
                <Text style={styles.waitingText}>
                  De sessie start zodra de host op "Start sessie" klikt.
                </Text>
                <View style={styles.loadingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>

              {/* Deelnemerslijst */}
              <View style={styles.participantsBox}>
                <Text style={styles.participantsTitle}>
                  Deelnemers ({participants.length})
                </Text>

                {participants.length === 0 && (
                  <Text style={styles.emptyText}>
                    Nog geen andere deelnemers.
                  </Text>
                )}

                {participants.map((p) => (
                  <View key={p.id} style={styles.participantRow}>
                    <Text style={styles.participantName}>
                      {p.name}
                      {p.id === participantId ? ' (Jij)' : ''}
                    </Text>
                    {p.role === 'host' && (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>Host</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </Card>

            <Button
              title="Sessie verlaten"
              onPress={handleLeave}
              variant="danger"
              style={{ width: '100%', marginTop: 24 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 32,
    alignItems: 'center',
  },
  watermark: {
    position: 'absolute',
    width: 280,
    height: 280,
    opacity: 0.13,
    zIndex: -1,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    color: '#121212',
  },
  sessionName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#00D36D',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#121212',
  },
  waitingContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  waitingText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00D36D',
    opacity: 0.3,
  },
  dot1: { opacity: 1 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.3 },
  participantsBox: {
    width: '100%',
    marginTop: 20,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  participantRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 14,
    color: '#121212',
  },
  hostBadge: {
    backgroundColor: '#00D36D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  hostBadgeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
  },
});
