import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import type { SavedEvent } from '@/types/event';

/** Formats an ISO/date string for display, falling back to the raw string if unparseable. */
export function formatEventDate(rawDate: string | null): string | null {
  if (!rawDate) {
    return null;
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed);
  } catch {
    return rawDate;
  }
}

/** Returns the event's site name or a clean hostname fallback. */
export function getEventSourceLabel(event: Pick<SavedEvent, 'siteName' | 'sourceUrl'>): string {
  if (event.siteName) {
    return event.siteName;
  }
  try {
    return new URL(event.sourceUrl).hostname.replace(/^www\./i, '');
  } catch {
    return 'Event link';
  }
}

/** Opens an event URL in the in-app browser on native or a new tab/window on web. */
export async function openEventUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }

  await openBrowserAsync(url, {
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
  });
}
