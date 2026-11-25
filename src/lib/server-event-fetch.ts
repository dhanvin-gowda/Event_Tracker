import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  extractEventMetadata,
  isBlockedHostname,
  normalizeEventUrl,
} from '@/lib/event-parser';
import type { ExtractedEvent } from '@/types/event';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_CHARS = 2_000_000;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const authVerifierClient =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

/** Builds CORS headers allowing browser extensions and local/web app origins. */
export function getCorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

export type AuthSuccess = {
  userId: string;
  supabase: SupabaseClient;
  errorResponse?: never;
};

export type AuthFailure = {
  errorResponse: Response;
  userId?: never;
  supabase?: never;
};

/** Verifies the request Bearer JWT via Supabase Auth and returns a RLS-scoped client. */
export async function authenticateRequest(
  request: Request,
  headers: Record<string, string>
): Promise<AuthSuccess | AuthFailure> {
  if (!authVerifierClient || !supabaseUrl || !supabasePublishableKey) {
    return {
      errorResponse: Response.json(
        { error: 'Server authentication is not configured.' },
        { status: 500, headers }
      ),
    };
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = match?.[1]?.trim();

  if (!token) {
    return {
      errorResponse: Response.json(
        { error: 'Authentication required. Please sign in again.' },
        { status: 401, headers }
      ),
    };
  }

  const { data, error } = await authVerifierClient.auth.getUser(token);
  if (error || !data.user) {
    return {
      errorResponse: Response.json(
        { error: 'Invalid or expired session token.' },
        { status: 401, headers }
      ),
    };
  }

  const scopedClient = createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return { userId: data.user.id, supabase: scopedClient };
}

export type ExtractSuccess = {
  event: ExtractedEvent;
  errorResponse?: never;
};

export type ExtractFailure = {
  errorResponse: Response;
  event?: never;
};

/** Validates `{ url }`, fetches the remote HTML safely, and extracts event metadata. */
export async function fetchAndExtractEventFromRequest(
  request: Request,
  headers: Record<string, string>
): Promise<ExtractSuccess | ExtractFailure> {
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
    return {
      errorResponse: Response.json({ error: 'Invalid request body.' }, { status: 400, headers }),
    };
  }

  let targetUrl: string;
  try {
    targetUrl = normalizeEventUrl(rawUrl);
  } catch (err) {
    return {
      errorResponse: Response.json(
        { error: err instanceof Error ? err.message : 'Invalid event URL.' },
        { status: 400, headers }
      ),
    };
  }

  const parsedTarget = new URL(targetUrl);
  if (isBlockedHostname(parsedTarget.hostname)) {
    return {
      errorResponse: Response.json(
        { error: 'Local or private network URLs are not allowed.' },
        { status: 400, headers }
      ),
    };
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
        'User-Agent': 'Mozilla/5.0 (compatible; EventFetcherBot/1.0; +https://expo.dev)',
      },
    });

    if (!upstream.ok) {
      return {
        errorResponse: Response.json(
          { error: `Event page returned HTTP ${upstream.status}.` },
          { status: 422, headers }
        ),
      };
    }

    const finalUrl = upstream.url || targetUrl;
    const finalParsed = new URL(finalUrl);
    if (isBlockedHostname(finalParsed.hostname)) {
      return {
        errorResponse: Response.json(
          { error: 'Redirected to a disallowed private network address.' },
          { status: 400, headers }
        ),
      };
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml')
    ) {
      return {
        errorResponse: Response.json(
          { error: 'The provided URL did not return an HTML event page.' },
          { status: 422, headers }
        ),
      };
    }

    const html = (await upstream.text()).slice(0, MAX_HTML_CHARS);
    if (!html.trim()) {
      return {
        errorResponse: Response.json(
          { error: 'The event page returned empty content.' },
          { status: 422, headers }
        ),
      };
    }

    return { event: extractEventMetadata(html, finalUrl) };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        errorResponse: Response.json(
          { error: 'Timed out while fetching the event URL.' },
          { status: 504, headers }
        ),
      };
    }
    return {
      errorResponse: Response.json(
        { error: 'Unable to reach that event URL. Check the link and try again.' },
        { status: 502, headers }
      ),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
