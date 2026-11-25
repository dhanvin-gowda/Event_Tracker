import { router } from 'expo-router';
import { ArrowRight, CalendarPlus, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventCard } from '@/components/ui/event-card';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { normalizeEventUrl } from '@/lib/event-parser';
import { deleteSavedEvent, fetchEventFromUrl, listSavedEvents, saveEvent } from '@/lib/events';
import { supabase } from '@/lib/supabase';
import { SavedEvent } from '@/types/event';

const MAX_CONTENT_WIDTH = 800;

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<SavedEvent[]>([]);

  const loadEvents = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingEvents(true);
    }

    try {
      const saved = await listSavedEvents();
      setEvents(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load saved events.');
    } finally {
      setIsLoadingEvents(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (!session) {
        setIsCheckingSession(false);
        router.replace('/');
        return;
      }

      setIsCheckingSession(false);
      void loadEvents();
    };

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }
      if (!session) {
        setEvents([]);
        router.replace('/');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadEvents]);

  const handleSubmitUrl = async () => {
    if (isSubmitting) {
      return;
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeEventUrl(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please enter a valid event URL.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const extracted = await fetchEventFromUrl(normalizedUrl);
      const saved = await saveEvent(extracted);
      setEvents((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch and save that event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (deletingId) {
      return;
    }

    setError('');
    setDeletingId(id);

    try {
      await deleteSavedEvent(id);
      setEvents((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete event.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isCheckingSession) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadEvents(true);
            }}
            tintColor="#ffffff"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={[styles.searchContainer, isFocused && styles.searchFocused]}>
              <Search size={18} color="rgba(255, 255, 255, 0.5)" strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="Paste event URL (e.g. https://lu.ma/...)"
                placeholderTextColor="rgba(209, 213, 219, 0.75)"
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  if (error) {
                    setError('');
                  }
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isSubmitting}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleSubmitUrl}
                accessibilityLabel="Event URL"
              />

              {query.length > 0 && !isSubmitting ? (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setError('');
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear event URL"
                  style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                  <X size={16} color="rgba(255, 255, 255, 0.7)" strokeWidth={1.8} />
                </Pressable>
              ) : null}

              <Pressable
                onPress={handleSubmitUrl}
                disabled={isSubmitting || !query.trim()}
                accessibilityRole="button"
                accessibilityLabel="Fetch and save event"
                style={({ pressed }) => [
                  styles.submitButton,
                  (isSubmitting || !query.trim()) && styles.submitButtonDisabled,
                  pressed && styles.pressed,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#121212" />
                ) : (
                  <ArrowRight size={16} color="#121212" strokeWidth={2.2} />
                )}
              </Pressable>
            </View>

            {error ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            {events.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Saved Events</Text>
                <Text style={styles.sectionCount}>{events.length}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoadingEvents ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.loadingText}>Loading your saved events…</Text>
            </View>
          ) : (
            <SpotlightCard style={styles.emptyCard} contentStyle={styles.emptyContent}>
              <View style={styles.emptyIcon}>
                <CalendarPlus size={22} color="#ffffff" strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>No events saved yet</Text>
              <Text style={styles.emptySubtitle}>
                Paste an event link in the search bar above to fetch its details and store it as a
                card here.
              </Text>
            </SpotlightCard>
          )
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            isDeleting={deletingId === item.id}
            onDelete={handleDeleteEvent}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
  },
  headerBlock: {
    width: '100%',
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchFocused: {
    borderColor: 'rgba(156, 163, 175, 0.9)',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    borderRadius: 999,
  },
  submitButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'left',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionCount: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  separator: {
    height: 16,
  },
  loadingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyCard: {
    width: '100%',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 360,
  },
  pressed: {
    opacity: 0.7,
  },
});
