import { Image } from 'expo-image';
import { Calendar, ExternalLink, MapPin, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpotlightCard } from '@/components/ui/spotlight-card';
import { formatEventDate, getEventSourceLabel, openEventUrl } from '@/lib/event-format';
import { SavedEvent } from '@/types/event';

type EventCardProps = {
  event: SavedEvent;
  isDeleting?: boolean;
  onPress: (event: SavedEvent) => void;
  onDelete: (id: string) => void;
};

export function EventCard({ event, isDeleting = false, onPress, onDelete }: EventCardProps) {
  const formattedDate = formatEventDate(event.startDate);
  const sourceLabel = getEventSourceLabel(event);

  return (
    <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.22)" style={styles.card}>
      {event.imageUrl ? (
        <Pressable
          onPress={() => onPress(event)}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${event.title}`}
          style={({ pressed }) => pressed && styles.pressed}>
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
          />
        </Pressable>
      ) : null}

      <View style={styles.headerRow}>
        <Pressable
          onPress={() => onPress(event)}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${event.title}`}
          style={({ pressed }) => [styles.badge, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={styles.badgeText}>
            {sourceLabel}
          </Text>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              void openEventUrl(event.sourceUrl);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Open ${event.title} source link`}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <ExternalLink size={16} color="rgba(255, 255, 255, 0.78)" strokeWidth={1.8} />
          </Pressable>

          <Pressable
            onPress={() => onDelete(event.id)}
            disabled={isDeleting}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${event.title}`}
            style={({ pressed }) => [
              styles.iconButton,
              (pressed || isDeleting) && styles.pressed,
            ]}>
            <Trash2 size={16} color="#f87171" strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => onPress(event)}
        accessibilityRole="button"
        accessibilityLabel={`Open full details for ${event.title}`}
        style={({ pressed }) => pressed && styles.pressed}>
        <Text numberOfLines={2} style={styles.title}>
          {event.title}
        </Text>

        {formattedDate || event.location ? (
          <View style={styles.metaGroup}>
            {formattedDate ? (
              <View style={styles.metaRow}>
                <Calendar size={14} color="rgba(255, 255, 255, 0.55)" strokeWidth={1.8} />
                <Text numberOfLines={1} style={styles.metaText}>
                  {formattedDate}
                </Text>
              </View>
            ) : null}

            {event.location ? (
              <View style={styles.metaRow}>
                <MapPin size={14} color="rgba(255, 255, 255, 0.55)" strokeWidth={1.8} />
                <Text numberOfLines={1} style={styles.metaText}>
                  {event.location}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {event.description ? (
          <Text numberOfLines={3} style={styles.description}>
            {event.description}
          </Text>
        ) : null}
      </Pressable>
    </SpotlightCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: 168,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  badge: {
    maxWidth: '72%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 10,
  },
  metaGroup: {
    gap: 6,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 13,
  },
  description: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
