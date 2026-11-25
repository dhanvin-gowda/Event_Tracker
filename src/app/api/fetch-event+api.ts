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

  return Response.json({ event: extracted.event }, { headers });
}
