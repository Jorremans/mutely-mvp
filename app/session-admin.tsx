import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import {
  getParticipants,
  getSessionById,
  startSession,
  endSession,
  Participant,
  Session,
} from "@/services/sessionService";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";

type SessionParams = {
  sessionId?: string;
  code?: string;
  participantId?: string;
  name?: string;
  duration?: string;
};

/**
 * Sessiebeheer Scherm - ALLEEN VOOR HOST
 * 
 * Dit scherm is exclusief voor de sessie host/beheerder.
 * 
 * Functies:
 * - QR-code zodat deelnemers kunnen scannen en deelnemen
 * - Deellink die gekopieerd en gedeeld kan worden
 * - Start Sessie knop (wanneer sessie in 'waiting' status is)
 * - Beëindig Sessie knop
 * - Deelnemerslijst met realtime updates
 * 
 * Deelnemers zien dit scherm NOOIT.
 */
export default function SessionAdminScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<SessionParams>();

  const sessionId = useMemo(() => params.sessionId ?? "", [params.sessionId]);
  const code = useMemo(() => params.code ?? "", [params.code]);
  const participantId = params.participantId ?? "";
  const hostName = params.name ?? "Host";
  const duration = params.duration ?? "30";

  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Map voor realtime hook
  const participantsMapRef = useRef(new Map<string, Participant>());

  useEffect(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    participantsMapRef.current = map;
  }, [participants]);

  // Laad initiële data
  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    if (!sessionId) return;

    const [participantsData, sessionInfo] = await Promise.all([
      getParticipants(sessionId),
      getSessionById(sessionId),
    ]);

    setParticipants(participantsData);
    setSessionData(sessionInfo);
  };

  // Realtime callbacks
  const handleParticipantJoin = useCallback((participant: Participant) => {
    setParticipants((prev) =>
      prev.find((p) => p.id === participant.id) ? prev : [...prev, participant]
    );
  }, []);

  const handleParticipantLeave = useCallback((participant: Participant) => {
    setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
  }, []);

  const handleSessionUpdate = useCallback((session: Session) => {
    setSessionData(session);
  }, []);

  const handleSessionEnd = useCallback(() => {
    Alert.alert("Sessie beëindigd", "De sessie is beëindigd.");
    router.replace("/");
  }, []);

  useSessionRealtime({
    sessionId: sessionId,
    callbacks: {
      onParticipantJoin: handleParticipantJoin,
      onParticipantLeave: handleParticipantLeave,
      onSessionStart: handleSessionUpdate,
      onSessionEnd: handleSessionEnd,
    },
    participantsMap: participantsMapRef.current,
  });

  /**
   * Join URL - Gebruik HTTPS voor betere compatibiliteit met camerascanners
   */
  const joinUrl = useMemo(() => {
    if (code) {
      return `https://mutely.app/join?code=${encodeURIComponent(code)}`;
    }
    if (sessionId) {
      return `https://mutely.app/join?sessionId=${encodeURIComponent(sessionId)}`;
    }
    return "https://mutely.app/join";
  }, [code, sessionId]);

  // Geformatteerde code voor weergave (123-456)
  const formattedCode = useMemo(() => {
    if (code.length === 6) {
      return `${code.slice(0, 3)}-${code.slice(3)}`;
    }
    return code;
  }, [code]);

  const onShareLink = async () => {
    try {
      await Share.share({
        message: `Doe mee met mijn Mutely sessie!\n\nCode: ${formattedCode}\n\nOf open deze link: ${joinUrl}`,
        title: "Mutely Sessie",
      });
    } catch (error) {
      console.error("Deel fout:", error);
    }
  };

  const onStartSession = async () => {
    Alert.alert(
      "Sessie starten?",
      `Wil je de sessie starten met ${participants.length} deelnemer${participants.length !== 1 ? "s" : ""}?`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Start sessie",
          onPress: async () => {
            setStarting(true);
            try {
              const success = await startSession(sessionId);
              if (success) {
                // Navigeer naar host live weergave
                router.replace(
                  `/session-live?code=${code}&sessionId=${sessionId}&participantId=${participantId}` +
                    `&name=${hostName}&duration=${duration}&isHost=true`
                );
              } else {
                Alert.alert("Fout", "Kon de sessie niet starten. Probeer opnieuw.");
              }
            } catch (error) {
              console.error("Start sessie fout:", error);
              Alert.alert("Fout", "Er ging iets mis bij het starten van de sessie.");
            } finally {
              setStarting(false);
            }
          },
        },
      ]
    );
  };

  const onEndSession = () => {
    Alert.alert(
      "Sessie beëindigen?",
      "Weet je zeker dat je deze sessie wilt beëindigen? Alle deelnemers worden afgesloten.",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Beëindigen",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await endSession(sessionId);
              Alert.alert("Sessie beëindigd", "De sessie is succesvol beëindigd.");
              router.replace("/");
            } catch {
              Alert.alert("Fout", "Er ging iets mis bij het beëindigen van de sessie.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const isWaiting = sessionData?.status === "waiting" || !sessionData;
  const guestCount = participants.filter((p) => p.role === "guest").length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        {/* Header */}
        <Text style={styles.title}>Sessiebeheer</Text>
        <Text style={styles.subtitle}>
          Deel de QR-code of link zodat anderen kunnen deelnemen.
        </Text>

        {/* QR Kaart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Uitnodigen via QR</Text>

          <View style={styles.qrWrap}>
            <QRCode value={joinUrl} size={180} />
          </View>

          <View style={styles.codeDisplay}>
            <Text style={styles.codeLabel}>Sessiecode</Text>
            <Text style={styles.codeValue}>{formattedCode}</Text>
          </View>

          <Text style={styles.smallLabel}>Deellink</Text>
          <Text style={styles.mono} numberOfLines={2}>
            {joinUrl}
          </Text>

          <Pressable style={styles.btn} onPress={onShareLink}>
            <Text style={styles.btnText}>Deel uitnodiging</Text>
          </Pressable>
        </View>

        {/* Deelnemers Kaart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Deelnemers ({participants.length})
          </Text>

          {participants.length === 0 ? (
            <Text style={styles.emptyText}>
              Nog geen deelnemers. Deel de QR-code om mensen uit te nodigen.
            </Text>
          ) : (
            <View style={styles.participantsList}>
              {participants.map((p) => (
                <View key={p.id} style={styles.participantRow}>
                  <Text style={styles.participantName}>
                    {p.name}
                    {p.id === participantId ? " (Jij)" : ""}
                  </Text>
                  {p.role === "host" && (
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>Host</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sessie Acties Kaart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sessie-acties</Text>

          {isWaiting ? (
            <>
              <Text style={styles.bodyText}>
                Klaar om te beginnen? Start de sessie wanneer alle deelnemers zijn
                aangesloten.
              </Text>

              <Pressable
                style={[styles.btn, styles.btnPrimary, starting && styles.btnDisabled]}
                onPress={onStartSession}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    Start sessie ({guestCount} gast{guestCount !== 1 ? "en" : ""})
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <Text style={styles.bodyText}>
              De sessie is actief. Je kunt de sessie beëindigen wanneer je klaar bent.
            </Text>
          )}

          <Pressable
            style={[styles.btn, styles.btnDanger, loading && styles.btnDisabled]}
            onPress={onEndSession}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sessie beëindigen</Text>
            )}
          </Pressable>
        </View>

        {/* Terug knop */}
        <Pressable style={styles.backBtn} onPress={() => router.replace("/")}>
          <Text style={styles.backBtnText}>Terug naar home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  page: {
    padding: 16,
    paddingTop: 20,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#121212",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
    color: "#444",
  },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#121212",
  },
  qrWrap: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
  },
  codeDisplay: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
  },
  codeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#00D36D",
    letterSpacing: 4,
  },
  smallLabel: {
    fontSize: 12,
    opacity: 0.6,
    color: "#666",
  },
  mono: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#444",
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  btnPrimary: {
    backgroundColor: "#00D36D",
  },
  btnDanger: {
    backgroundColor: "#DC2626",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555",
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  participantsList: {
    gap: 8,
  },
  participantRow: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  participantName: {
    fontSize: 14,
    color: "#121212",
  },
  hostBadge: {
    backgroundColor: "#00D36D",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  hostBadgeText: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "700",
  },
  backBtn: {
    alignItems: "center",
    paddingVertical: 16,
  },
  backBtnText: {
    fontSize: 14,
    color: "#666",
    textDecorationLine: "underline",
  },
});
