/* global chrome, DOMParser, HEXTA_CONFIG, atob */

const STORAGE_KEYS = {
  SESSION: 'hexta_supabase_session',
  APP_ORIGIN: 'hexta_app_origin',
};

const els = {
  userControls: document.getElementById('user-controls'),
  userEmail: document.getElementById('user-email'),
  signOutBtn: document.getElementById('sign-out-btn'),
  authSection: document.getElementById('auth-section'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginSubmit: document.getElementById('login-submit'),
  saverSection: document.getElementById('saver-section'),
  tabTitle: document.getElementById('tab-title'),
  saveForm: document.getElementById('save-form'),
  eventUrl: document.getElementById('event-url'),
  saveBtn: document.getElementById('save-btn'),
  savedPreview: document.getElementById('saved-preview'),
  previewSite: document.getElementById('preview-site'),
  previewTitle: document.getElementById('preview-title'),
  previewDate: document.getElementById('preview-date'),
  previewLocation: document.getElementById('preview-location'),
  openDashboardBtn: document.getElementById('open-dashboard-btn'),
  statusError: document.getElementById('status-error'),
  serverOrigin: document.getElementById('server-origin'),
  saveOriginBtn: document.getElementById('save-origin-btn'),
};

let activeTabInfo = null;

function showError(message) {
  if (!message) {
    els.statusError.textContent = '';
    els.statusError.classList.add('hidden');
    return;
  }
  els.statusError.textContent = message;
  els.statusError.classList.remove('hidden');
}

function cleanText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEventUrl(rawInput) {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    throw new Error('Please enter or select an event URL.');
  }
  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https event URLs are supported.');
  }
  return parsed.toString();
}

function normalizeOrigin(rawOrigin) {
  const trimmed = (rawOrigin || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return HEXTA_CONFIG.DEFAULT_APP_ORIGIN;
  }
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Dashboard URL must start with http:// or https://');
  }
  return parsed.origin;
}

function resolveHttpUrl(rawUrl, baseUrl) {
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

function isEventType(rawType) {
  if (typeof rawType === 'string') {
    const normalized = rawType.replace(/^https?:\/\/schema\.org\//i, '');
    return normalized === 'Event' || (normalized.endsWith('Event') && normalized !== 'DeliveryEvent');
  }
  if (Array.isArray(rawType)) {
    return rawType.some((entry) => isEventType(entry));
  }
  return false;
}

function findJsonLdEvent(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJsonLdEvent(item);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (!node || typeof node !== 'object') {
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
  if (node.mainEntity && typeof node.mainEntity === 'object') {
    const found = findJsonLdEvent(node.mainEntity);
    if (found) {
      return found;
    }
  }
  return null;
}

function extractJsonLdImage(rawImage, baseUrl) {
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
  if (rawImage && typeof rawImage === 'object') {
    return resolveHttpUrl(rawImage.url || rawImage.contentUrl, baseUrl);
  }
  return null;
}

function extractJsonLdLocation(rawLocation) {
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
  if (!rawLocation || typeof rawLocation !== 'object') {
    return null;
  }

  const name = cleanText(rawLocation.name);
  const address = rawLocation.address;
  let addressText = null;

  if (typeof address === 'string') {
    addressText = cleanText(address);
  } else if (address && typeof address === 'object') {
    const parts = [
      cleanText(address.streetAddress),
      cleanText(address.addressLocality),
      cleanText(address.addressRegion),
      cleanText(address.addressCountry),
    ].filter(Boolean);
    addressText = parts.length > 0 ? parts.join(', ') : null;
  }

  if (name && addressText && !addressText.toLowerCase().includes(name.toLowerCase())) {
    return `${name} · ${addressText}`;
  }
  return name || addressText || cleanText(rawLocation.url);
}

function extractMetadataFromHtml(html, finalUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let jsonLd = {};

  const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of ldScripts) {
    const raw = (script.textContent || '').trim();
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      const eventNode = findJsonLdEvent(parsed);
      if (eventNode) {
        const organizer =
          eventNode.organizer && typeof eventNode.organizer === 'object'
            ? cleanText(eventNode.organizer.name)
            : cleanText(eventNode.organizer);

        jsonLd = {
          title: cleanText(eventNode.name),
          description: cleanText(eventNode.description),
          startDate: cleanText(eventNode.startDate),
          endDate: cleanText(eventNode.endDate),
          location: extractJsonLdLocation(eventNode.location),
          imageUrl: extractJsonLdImage(eventNode.image, finalUrl),
          siteName: organizer,
        };
        break;
      }
    } catch {
      // Ignore malformed JSON-LD script blocks.
    }
  }

  const metaContent = (key) => {
    const el = doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
    return el ? cleanText(el.getAttribute('content')) : null;
  };

  let fallbackHost = finalUrl;
  try {
    fallbackHost = new URL(finalUrl).hostname.replace(/^www\./i, '');
  } catch {
    // Keep fallbackHost.
  }

  const title =
    jsonLd.title ||
    metaContent('og:title') ||
    metaContent('twitter:title') ||
    cleanText(doc.title) ||
    fallbackHost;

  const description =
    jsonLd.description ||
    metaContent('og:description') ||
    metaContent('twitter:description') ||
    metaContent('description') ||
    null;

  const startDate =
    jsonLd.startDate || metaContent('event:start_time') || metaContent('og:event:start_time') || null;

  const endDate =
    jsonLd.endDate || metaContent('event:end_time') || metaContent('og:event:end_time') || null;

  const location =
    jsonLd.location || metaContent('event:location') || metaContent('place:location:name') || null;

  const rawImage =
    jsonLd.imageUrl ||
    metaContent('og:image:secure_url') ||
    metaContent('og:image') ||
    metaContent('twitter:image:src') ||
    metaContent('twitter:image') ||
    null;

  return {
    sourceUrl: finalUrl,
    title,
    description,
    startDate,
    endDate,
    location,
    imageUrl: rawImage ? resolveHttpUrl(rawImage, finalUrl) : null,
    siteName: metaContent('og:site_name') || jsonLd.siteName || fallbackHost,
  };
}

async function captureEventMetadata(targetUrl) {
  if (activeTabInfo && activeTabInfo.id && activeTabInfo.url === targetUrl && chrome.scripting) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTabInfo.id },
        func: () => ({
          html: document.documentElement ? document.documentElement.outerHTML : '',
          finalUrl: window.location.href,
        }),
      });
      const captured = results && results[0] && results[0].result;
      if (captured && captured.html) {
        return extractMetadataFromHtml(
          captured.html.slice(0, 2_000_000),
          captured.finalUrl || targetUrl
        );
      }
    } catch {
      // Fall back to direct fetch when scripting is restricted on the tab.
    }
  }

  const response = await fetch(targetUrl, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Event page returned HTTP ${response.status}.`);
  }

  const html = (await response.text()).slice(0, 2_000_000);
  if (!html.trim()) {
    throw new Error('The event page returned empty content.');
  }

  return extractMetadataFromHtml(html, response.url || targetUrl);
}

async function getStoredState() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.SESSION, STORAGE_KEYS.APP_ORIGIN]);
  return {
    session: result[STORAGE_KEYS.SESSION] || null,
    appOrigin: result[STORAGE_KEYS.APP_ORIGIN] || HEXTA_CONFIG.DEFAULT_APP_ORIGIN,
  };
}

async function saveSession(session) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SESSION]: session });
}

async function clearSession() {
  await chrome.storage.local.remove(STORAGE_KEYS.SESSION);
}

function getUserIdFromToken(accessToken) {
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) {
      return null;
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const payload = JSON.parse(json);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function mapSupabaseSession(data) {
  const expiresInMs = (Number(data.expires_in) || 3600) * 1000;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + expiresInMs,
    user: data.user || null,
  };
}

async function readResponsePayload(response) {
  const rawText = await response.text();
  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    // Non-JSON error response.
  }
  return { json, rawText };
}

async function signInWithPassword(email, password) {
  const response = await fetch(
    `${HEXTA_CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: HEXTA_CONFIG.SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const { json } = await readResponsePayload(response);
  if (!response.ok || !json || !json.access_token) {
    throw new Error((json && (json.error_description || json.msg)) || 'Sign in failed.');
  }

  const session = mapSupabaseSession(json);
  await saveSession(session);
  return session;
}

async function refreshSupabaseSession(refreshToken) {
  const response = await fetch(
    `${HEXTA_CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: HEXTA_CONFIG.SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  const { json } = await readResponsePayload(response);
  if (!response.ok || !json || !json.access_token) {
    await clearSession();
    throw new Error('Session expired. Please sign in again.');
  }

  const session = mapSupabaseSession(json);
  await saveSession(session);
  return session;
}

async function getValidSession(forceRefresh = false) {
  const { session } = await getStoredState();
  if (!session || !session.access_token) {
    throw new Error('Please sign in first.');
  }

  const isExpiringSoon = !session.expires_at || session.expires_at - 60_000 <= Date.now();
  if (!forceRefresh && !isExpiringSoon) {
    return session;
  }

  if (!session.refresh_token) {
    await clearSession();
    throw new Error('Session expired. Please sign in again.');
  }

  return refreshSupabaseSession(session.refresh_token);
}

async function upsertEventInSupabase(extracted, session) {
  const userId = (session.user && session.user.id) || getUserIdFromToken(session.access_token);
  if (!userId) {
    throw new Error('Unable to identify signed-in user. Please sign in again.');
  }

  const response = await fetch(
    `${HEXTA_CONFIG.SUPABASE_URL}/rest/v1/events?on_conflict=user_id,source_url`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: HEXTA_CONFIG.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        source_url: extracted.sourceUrl,
        title: extracted.title,
        description: extracted.description,
        start_date: extracted.startDate,
        end_date: extracted.endDate,
        location: extracted.location,
        image_url: extracted.imageUrl,
        site_name: extracted.siteName,
      }),
    }
  );

  const { json, rawText } = await readResponsePayload(response);
  if (!response.ok) {
    const errorMsg =
      (json && (json.message || json.error_description || json.error || json.hint)) ||
      (rawText ? `HTTP ${response.status}: ${rawText.slice(0, 140)}` : `HTTP ${response.status}`);
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  const row = Array.isArray(json) ? json[0] : json;
  return {
    sourceUrl: (row && row.source_url) || extracted.sourceUrl,
    title: (row && row.title) || extracted.title,
    startDate: (row && row.start_date) || extracted.startDate,
    location: (row && row.location) || extracted.location,
    siteName: (row && row.site_name) || extracted.siteName,
  };
}

function renderSavedPreview(event) {
  els.previewSite.textContent = event.siteName || 'Event';
  els.previewTitle.textContent = event.title || event.sourceUrl;
  els.previewDate.textContent = event.startDate || '';
  els.previewDate.classList.toggle('hidden', !event.startDate);
  els.previewLocation.textContent = event.location || '';
  els.previewLocation.classList.toggle('hidden', !event.location);
  els.savedPreview.classList.remove('hidden');
}

function renderAuthUI(session) {
  const signedIn = Boolean(session && session.access_token);
  els.authSection.classList.toggle('hidden', signedIn);
  els.saverSection.classList.toggle('hidden', !signedIn);
  els.userControls.classList.toggle('hidden', !signedIn);
  els.userEmail.textContent = (session && session.user && session.user.email) || '';
  if (!signedIn) {
    els.savedPreview.classList.add('hidden');
  }
}

async function populateActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    return;
  }
  activeTabInfo = tab;
  els.tabTitle.textContent = tab.title || '';
  if (tab.url && /^https?:\/\//i.test(tab.url)) {
    els.eventUrl.value = tab.url;
  }
}

async function init() {
  const { session, appOrigin } = await getStoredState();
  els.serverOrigin.value = appOrigin;
  renderAuthUI(session);
  await populateActiveTab();
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');
  els.loginSubmit.disabled = true;
  els.loginSubmit.textContent = 'Signing in…';

  try {
    const session = await signInWithPassword(
      els.loginEmail.value.trim(),
      els.loginPassword.value
    );
    els.loginPassword.value = '';
    renderAuthUI(session);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Unable to sign in.');
  } finally {
    els.loginSubmit.disabled = false;
    els.loginSubmit.textContent = 'Sign in';
  }
});

els.signOutBtn.addEventListener('click', async () => {
  showError('');
  await clearSession();
  renderAuthUI(null);
});

els.saveOriginBtn.addEventListener('click', async () => {
  showError('');
  try {
    const normalized = normalizeOrigin(els.serverOrigin.value);
    els.serverOrigin.value = normalized;
    await chrome.storage.local.set({ [STORAGE_KEYS.APP_ORIGIN]: normalized });
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Invalid Dashboard URL.');
  }
});

els.saveForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');
  els.savedPreview.classList.add('hidden');

  let targetUrl;
  try {
    targetUrl = normalizeEventUrl(els.eventUrl.value);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Please enter a valid event URL.');
    return;
  }

  els.saveBtn.disabled = true;
  els.saveBtn.textContent = 'Fetching & saving…';

  try {
    const extracted = await captureEventMetadata(targetUrl);
    let session = await getValidSession(false);

    let saved;
    try {
      saved = await upsertEventInSupabase(extracted, session);
    } catch (err) {
      if (err && err.status === 401) {
        session = await getValidSession(true);
        saved = await upsertEventInSupabase(extracted, session);
      } else {
        throw err;
      }
    }

    renderSavedPreview(saved);
  } catch (err) {
    if (err && err.status === 401) {
      await clearSession();
      renderAuthUI(null);
    }
    showError(err instanceof Error ? err.message : 'Unable to save event from this URL.');
  } finally {
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = 'Save Event to App';
  }
});

els.openDashboardBtn.addEventListener('click', async () => {
  const { appOrigin } = await getStoredState();
  await chrome.tabs.create({ url: `${appOrigin}/dashboard` });
});

void init();
