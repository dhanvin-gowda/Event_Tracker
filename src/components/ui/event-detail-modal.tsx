import { Image } from 'expo-image';
import { Calendar, Clock, ExternalLink, Globe, MapPin, Trash2, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SpotlightCard } from '@/components/ui/spotlight-card';
import { formatEventDate, getEventSourceLabel, openEventUrl } from '@/lib/event-format';
import { SavedEvent } from '@/types/event';

type EventDetailModalProps = {
  event: SavedEvent | null;
  isDeleting?: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
};

export function EventDetailModal({
  event,
  isDeleting = false,
  onClose,
  onDelete,
}: EventDetailModalProps) {
  if (!event) {
    return null;
  }

  const startText = formatEventDate(event.startDate);
  const endText = formatEventDate(event.endDate);
  const savedText = formatEventDate(event.createdAt);
  const sourceLabel = getEventSourceLabel(event);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close event details"
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.dialogWrapper}>
          <SpotlightCard
            spotlightColor="rgba(255, 255, 255, 0.2)"
            style={styles.card}
            contentStyle={styles.cardContent}>
            <View style={styles.topBar}>
              <View style={styles.badge}>
                <Text numberOfLines={1} style={styles.badgeText}>
                  {sourceLabel}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close details"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <X size={18} color="#ffffff" strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}>
              {event.imageUrl ? (
                <Image
                  source={{ uri: event.imageUrl }}
                  style={styles.coverImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : null}

              <Text selectable style={styles.title}>
                {event.title}
              </Text>

              <View style={styles.detailsSection}>
                {startText ? (
                  <View style={styles.detailRow}>
                    <Calendar size={16} color="rgba(255, 255, 255, 0.65)" strokeWidth={1.8} />
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Starts</Text>
                      <Text selectable style={styles.detailValue}>
                        {startText}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {endText ? (
                  <View style={styles.detailRow}>
                    <Clock size={16} color="rgba(255, 255, 255, 0.65)" strokeWidth={1.8} />
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Ends</Text>
                      <Text selectable style={styles.detailValue}>
                        {endText}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {event.location ? (
                  <View style={styles.detailRow}>
                    <MapPin size={16} color="rgba(255, 255, 255, 0.65)" strokeWidth={1.8} />
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text selectable style={styles.detailValue}>
                        {event.location}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Globe size={16} color="rgba(255, 255, 255, 0.65)" strokeWidth={1.8} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Source URL</Text>
                    <Text selectable style={styles.urlValue}>
                      {event.sourceUrl}
                    </Text>
                  </View>
                </View>
              </View>

              {event.description ? (
                <View style={styles.descriptionBlock}>
                  <Text style={styles.detailLabel}>About this event</Text>
                  <Text selectable style={styles.description}>
                    {event.description}
                  </Text>
                </View>
              ) : null}

              {savedText ? <Text style={styles.savedAt}>Saved {savedText}</Text> : null}
            </ScrollView>

            <View style={styles.footerActions}>
              <Pressable
                onPress={() => {
                  void openEventUrl(event.sourceUrl);
                }}
                accessibilityRole="button"
                accessibilityLabel="Open event page"
                style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}>
                <ExternalLink size={16} color="#121212" strokeWidth={2} />
                <Text style={styles.openButtonText}>Open event page</Text>
              </Pressable>

              <Pressable
                onPress={() => onDelete(event.id)}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${event.title}`}
                style={({ pressed }) => [
                  styles.deleteButton,
                  (pressed || isDeleting) && styles.pressed,
                ]}>
                <Trash2 size={16} color="#f87171" strokeWidth={1.9} />
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </SpotlightCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  dialogWrapper: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
  },
  card: {
    width: '100%',
    maxHeight: '100%',
    padding: 20,
  },
  cardContent: {
    maxHeight: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  badge: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  badgeText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  scrollBody: {
    gap: 16,
    paddingBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: 210,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  detailsSection: {
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailTextWrap: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  urlValue: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 13,
    lineHeight: 19,
  },
  descriptionBlock: {
    gap: 6,
  },
  description: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 22,
  },
  savedAt: {
    color: '#6b7280',
    fontSize: 12,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  openButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  openButtonText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  deleteButtonText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
});
