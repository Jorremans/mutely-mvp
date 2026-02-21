/**
 * Wall of Shame Component
 * Toont een lijst van Snitch-overtredingen tijdens een live sessie
 * 
 * Weergavemodi:
 * - Vriendelijk (standaard): "Jordy heeft de stilte verlaten (na 05:20)"
 * - Savage: "Jordy kan niet langer dan 05:20 zonder telefoon"
 * 
 * Toont ook terugkeer-events indien beschikbaar.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DisplayMode } from './SnitchBanner';

export interface WallOfShameEvent {
  id: string;
  participantName: string;
  timestamp: string; // HH:MM format
  durationStayed: string; // mm:ss format
  createdAt: string; // ISO string for sorting
  eventType?: string; // 'left_session' or 'background_switch'
  returnedAt?: string; // ISO string, if participant returned
  returnedAfter?: string; // mm:ss format, time until return
}

interface WallOfShameProps {
  events: WallOfShameEvent[];
  displayMode: DisplayMode;
}

export const WallOfShame: React.FC<WallOfShameProps> = ({
  events,
  displayMode
}) => {
  if (events.length === 0) {
    return null;
  }

  const getEventMessage = (event: WallOfShameEvent) => {
    if (displayMode === 'savage') {
      return `${event.participantName} kan niet langer dan ${event.durationStayed} zonder telefoon`;
    }
    // Vriendelijke modus (standaard)
    return `${event.participantName} heeft de stilte verlaten (na ${event.durationStayed})`;
  };

  const getEventIcon = (event: WallOfShameEvent): any => {
    if (event.eventType === 'background_switch') {
      return 'swap-horizontal-outline';
    }
    return 'exit-outline';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list" size={18} color="#666" />
        <Text style={styles.headerText}>Sessie-overtredingen</Text>
      </View>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {events.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <View style={styles.eventIcon}>
              <Ionicons name={getEventIcon(event)} size={16} color="#FF6B6B" />
            </View>
            <View style={styles.eventContent}>
              <View style={styles.eventTextContainer}>
                <View style={styles.eventMainRow}>
                  <View style={styles.redDot} />
                  <Text style={styles.eventMessage}>
                    {getEventMessage(event)}
                  </Text>
                </View>
                {event.returnedAfter && (
                  <Text style={styles.returnText}>
                    Teruggekeerd na {event.returnedAfter}
                  </Text>
                )}
              </View>
              <Text style={styles.eventTime}>
                {event.timestamp}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  scrollView: {
    maxHeight: 140,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  eventIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  eventContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  eventMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
    marginRight: 6,
  },
  eventMessage: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  returnText: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
    marginLeft: 14,
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});

export default WallOfShame;
