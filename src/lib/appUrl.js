/** Base URL for shareable links (QR, clipboard). Works locally and when deployed. */
export function getAppOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function buildRencontreJoinUrl(sessionId) {
  const origin = getAppOrigin();
  const id = encodeURIComponent(sessionId);
  return `${origin}/join/${id}`;
}

export function parseSessionIdFromJoinInput(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/join\/([^/]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Not a URL — treat as raw session id.
  }

  return raw.replace(/^.*\/join\//i, '').split(/[?#]/)[0].trim();
}
