import type { SavedEvent } from '@/types/event';

export const EVENT_SELECT_COLUMNS =
  'id, user_id, source_url, title, description, start_date, end_date, location, image_url, site_name, created_at';

export type EventRow = {
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

/** Maps a Supabase `public.events` row into the app's `SavedEvent` shape. */
export function mapEventRow(row: EventRow): SavedEvent {
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
