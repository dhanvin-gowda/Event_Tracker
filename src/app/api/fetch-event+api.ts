import {
  extractEventMetadata,
  isBlockedHostname,
  normalizeEventUrl,
} from '@/lib/event-parser';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_CHARS = 2_000_000;

export async function POST(request: Request) {
  let rawUrl = '';
  try {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null && 'url' in body) {
      const candidate = (body as { url?: unknown }).url;
      if (typeof candidate === 'string') {
        rawUrl = candidate;
      }
    }
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = normalizeEventUrl(rawUrl);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Invalid event URL.' },
      { status: 400 }
    );
  }

  const parsedTarget = new URL(targetUrl);
  if (isBlockedHostname(parsedTarget.hostname)) {
    return Response.json(
      { error: 'Local or private network URLs are not allowed.' },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (compatible; EventFetcherBot/1.0; +https://expo.dev)',
      },
    });

    if (!upstream.ok) {
      return Response.json(
        { error: `Event page returned HTTP ${upstream.status}.` },
        { status: 422 }
      );
    }

    const finalUrl = upstream.url || targetUrl;
    const finalParsed = new URL(finalUrl);
    if (isBlockedHostname(finalParsed.hostname)) {
      return Response.json(
        { error: 'Redirected to a disallowed private network address.' },
        { status: 400 }
      );
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml')
    ) {
      return Response.json(
        { error: 'The provided URL did not return an HTML event page.' },
        { status: 422 }
      );
    }

    const html = (await upstream.text()).slice(0, MAX_HTML_CHARS);
    if (!html.trim()) {
      return Response.json(
        { error: 'The event page returned empty content.' },
        { status: 422 }
      );
    }

    const event = extractEventMetadata(html, finalUrl);
    return Response.json({ event });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return Response.json(
        { error: 'Timed out while fetching the event URL.' },
        { status: 504 }
      );
    }
    return Response.json(
      { error: 'Unable to reach that event URL. Check the link and try again.' },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
