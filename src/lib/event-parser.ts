import type { ExtractedEvent } from '@/types/event';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decodes common named and numeric HTML entities and collapses whitespace. */
function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const decoded = value
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, entity: string) => {
      if (entity.startsWith('#x') || entity.startsWith('#X')) {
        const code = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : full;
      }
      if (entity.startsWith('#')) {
        const code = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : full;
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? full;
    })
    .replace(/\s+/g, ' ')
    .trim();

  return decoded.length > 0 ? decoded : null;
}

/** Validates and normalizes user-entered event URLs to http/https. */
export function normalizeEventUrl(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Please enter an event URL.');
  }

  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error('Please enter a valid event URL (e.g., https://lu.ma/...).');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https event URLs are supported.');
  }

  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    throw new Error('Please enter a valid public event URL.');
  }

  return parsed.toString();
}

/** Rejects loopback, link-local, and private network hostnames to prevent SSRF. */
export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  // IPv4 private / loopback / link-local / CGNAT ranges
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true;
    }
  }

  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) {
    return true;
  }

  return false;
}

function resolveHttpUrl(rawUrl: unknown, baseUrl: string): string | null {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return null;
  }

  try {
    const resolved = new URL(rawUrl.trim(), baseUrl);
    return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEventType(rawType: unknown): boolean {
  if (typeof rawType === 'string') {
    const normalized = rawType.replace(/^https?:\/\/schema\.org\//i, '');
    return normalized === 'Event' || (normalized.endsWith('Event') && normalized !== 'DeliveryEvent');
  }
  if (Array.isArray(rawType)) {
    return rawType.some((entry) => isEventType(entry));
  }
  return false;
}

function findJsonLdEvent(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJsonLdEvent(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isRecord(node)) {
    return null;
  }

  if (isEventType(node['@type'])) {
    return node;
  }

  if (Array.isArray(node['@graph'])) {
    const found = findJsonLdEvent(node['@graph']);
    if (found) {
      return found;
    }
  }

  if (isRecord(node.mainEntity)) {
    const found = findJsonLdEvent(node.mainEntity);
    if (found) {
      return found;
    }
  }

  return null;
}

function extractJsonLdImage(rawImage: unknown, baseUrl: string): string | null {
  if (typeof rawImage === 'string') {
    return resolveHttpUrl(rawImage, baseUrl);
  }
  if (Array.isArray(rawImage)) {
    for (const entry of rawImage) {
      const resolved = extractJsonLdImage(entry, baseUrl);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }
  if (isRecord(rawImage)) {
    return resolveHttpUrl(rawImage.url ?? rawImage.contentUrl, baseUrl);
  }
  return null;
}

function extractJsonLdLocation(rawLocation: unknown): string | null {
  if (typeof rawLocation === 'string') {
    return cleanText(rawLocation);
  }
  if (Array.isArray(rawLocation)) {
    for (const item of rawLocation) {
      const extracted = extractJsonLdLocation(item);
      if (extracted) {
        return extracted;
      }
    }
    return null;
  }
  if (!isRecord(rawLocation)) {
    return null;
  }

  const name = cleanText(rawLocation.name);
  const address = rawLocation.address;
  let addressText: string | null = null;

  if (typeof address === 'string') {
    addressText = cleanText(address);
  } else if (isRecord(address)) {
    const parts = [
      cleanText(address.streetAddress),
      cleanText(address.addressLocality),
      cleanText(address.addressRegion),
      cleanText(address.addressCountry),
    ].filter((part): part is string => Boolean(part));
    addressText = parts.length > 0 ? parts.join(', ') : null;
  }

  if (name && addressText && !addressText.toLowerCase().includes(name.toLowerCase())) {
    return `${name} · ${addressText}`;
  }
  if (name || addressText) {
    return name ?? addressText;
  }

  return cleanText(rawLocation.url);
}

function parseJsonLdEvents(html: string, baseUrl: string): Partial<ExtractedEvent> {
  const scriptRegex =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptRegex)) {
    const rawJson = match[1]?.trim();
    if (!rawJson) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(rawJson);
      const eventNode = findJsonLdEvent(parsed);
      if (!eventNode) {
        continue;
      }

      const organizer = isRecord(eventNode.organizer)
        ? cleanText(eventNode.organizer.name)
        : cleanText(eventNode.organizer);

      return {
        title: cleanText(eventNode.name) ?? undefined,
        description: cleanText(eventNode.description),
        startDate: cleanText(eventNode.startDate),
        endDate: cleanText(eventNode.endDate),
        location: extractJsonLdLocation(eventNode.location),
        imageUrl: extractJsonLdImage(eventNode.image, baseUrl),
        siteName: organizer,
      };
    } catch {
      // Ignore malformed JSON-LD script blocks and continue scanning.
    }
  }

  return {};
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of tag.matchAll(attrRegex)) {
    const key = match[1]?.toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    if (key) {
      attrs[key] = val;
    }
  }

  return attrs;
}

function parseMetaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  const metaRegex = /<meta\b[^>]*>/gi;

  for (const match of html.matchAll(metaRegex)) {
    const attrs = parseAttributes(match[0]);
    const key = (attrs.property ?? attrs.name)?.toLowerCase();
    const content = cleanText(attrs.content);
    if (key && content && !tags.has(key)) {
      tags.set(key, content);
    }
  }

  return tags;
}

function parseTitleTag(html: string): string | null {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return cleanText(match?.[1]);
}

/** Extracts normalized event metadata from HTML using JSON-LD first, then OpenGraph/meta tags. */
export function extractEventMetadata(html: string, finalUrl: string): ExtractedEvent {
  const jsonLd = parseJsonLdEvents(html, finalUrl);
  const meta = parseMetaTags(html);
  const htmlTitle = parseTitleTag(html);

  let fallbackHost = finalUrl;
  try {
    fallbackHost = new URL(finalUrl).hostname.replace(/^www\./i, '');
  } catch {
    // Keep finalUrl fallback if URL parsing fails.
  }

  const title =
    jsonLd.title ??
    meta.get('og:title') ??
    meta.get('twitter:title') ??
    htmlTitle ??
    fallbackHost;

  const description =
    jsonLd.description ??
    meta.get('og:description') ??
    meta.get('twitter:description') ??
    meta.get('description') ??
    null;

  const startDate =
    jsonLd.startDate ?? meta.get('event:start_time') ?? meta.get('og:event:start_time') ?? null;

  const endDate =
    jsonLd.endDate ?? meta.get('event:end_time') ?? meta.get('og:event:end_time') ?? null;

  const location =
    jsonLd.location ?? meta.get('event:location') ?? meta.get('place:location:name') ?? null;

  const rawImage =
    jsonLd.imageUrl ??
    meta.get('og:image:secure_url') ??
    meta.get('og:image') ??
    meta.get('twitter:image:src') ??
    meta.get('twitter:image') ??
    null;

  const imageUrl = rawImage ? resolveHttpUrl(rawImage, finalUrl) : null;

  const siteName = meta.get('og:site_name') ?? jsonLd.siteName ?? fallbackHost;

  return {
    sourceUrl: finalUrl,
    title,
    description,
    startDate,
    endDate,
    location,
    imageUrl,
    siteName,
  };
}
