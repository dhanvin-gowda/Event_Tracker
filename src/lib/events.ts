import { supabase } from '@/lib/supabase';
import type { ExtractedEvent, SavedEvent } from '@/types/event';

type EventRow = {
  id: string;
  user_id: string;
  source_url: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  site_name: string | null;
  created_at: string;
};

function mapEventRow(row: EventRow): SavedEvent {
  return {
    id: row.id,
    userId: row.user_id,
    sourceUrl: row.source_url,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    imageUrl: row.image_url,
    siteName: row.site_name,
    createdAt: row.created_at,
  };
}

/** Fetches parsed event metadata from the Expo Router server API endpoint. */
export async function fetchEventFromUrl(url: string): Promise<ExtractedEvent> {
  const response = await fetch('/api/fetch-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

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
    .select(
      'id, user_id, source_url, title, description, start_date, end_date, location, image_url, site_name, created_at'
    )
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
    .select(
      'id, user_id, source_url, title, description, start_date, end_date, location, image_url, site_name, created_at'
    )
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
