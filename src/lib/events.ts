import { EVENT_SELECT_COLUMNS, type EventRow, mapEventRow } from '@/lib/event-row';
import { supabase } from '@/lib/supabase';
import type { ExtractedEvent, SavedEvent } from '@/types/event';

async function postFetchEvent(url: string, accessToken: string): Promise<Response> {
  return fetch('/api/fetch-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url }),
  });
}

/** Fetches parsed event metadata from the Expo Router server API endpoint using the user's JWT. */
export async function fetchEventFromUrl(url: string): Promise<ExtractedEvent> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let token = session?.access_token ?? null;
  if (!token) {
    throw new Error('Please sign in to fetch events.');
  }

  let response = await postFetchEvent(url, token);

  if (response.status === 401) {
    const {
      data: { session: refreshedSession },
    } = await supabase.auth.refreshSession();

    token = refreshedSession?.access_token ?? null;
    if (token) {
      response = await postFetchEvent(url, token);
    }
  }

  let payload: { event?: ExtractedEvent; error?: string } | null = null;
  try {
    payload = (await response.json()) as { event?: ExtractedEvent; error?: string };
  } catch {
    // Handle non-JSON responses below.
  }

  if (!response.ok || !payload?.event) {
    throw new Error(payload?.error ?? 'Failed to fetch event details from that URL.');
  }

  return payload.event;
}

/** Loads all saved events belonging to the currently signed-in user. */
export async function listSavedEvents(): Promise<SavedEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as EventRow[]).map(mapEventRow);
}

/** Upserts a fetched event for the current user so duplicate URLs update cleanly. */
export async function saveEvent(event: ExtractedEvent): Promise<SavedEvent> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Please sign in to save events.');
  }

  const { data, error } = await supabase
    .from('events')
    .upsert(
      {
        user_id: user.id,
        source_url: event.sourceUrl,
        title: event.title,
        description: event.description,
        start_date: event.startDate,
        end_date: event.endDate,
        location: event.location,
        image_url: event.imageUrl,
        site_name: event.siteName,
      },
      { onConflict: 'user_id,source_url' }
    )
    .select(EVENT_SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapEventRow(data as EventRow);
}

/** Deletes a saved event card by ID. */
export async function deleteSavedEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}
