import { EVENT_SELECT_COLUMNS, type EventRow, mapEventRow } from '@/lib/event-row';
import {
  authenticateRequest,
  fetchAndExtractEventFromRequest,
  getCorsHeaders,
} from '@/lib/server-event-fetch';

export function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: Request) {
  const headers = getCorsHeaders(request);

  const auth = await authenticateRequest(request, headers);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  const extracted = await fetchAndExtractEventFromRequest(request, headers);
  if (extracted.errorResponse) {
    return extracted.errorResponse;
  }

  const { event } = extracted;
  const { data, error } = await auth.supabase
    .from('events')
    .upsert(
      {
        user_id: auth.userId,
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
    return Response.json({ error: error.message }, { status: 500, headers });
  }

  return Response.json({ event: mapEventRow(data as EventRow) }, { headers });
}
