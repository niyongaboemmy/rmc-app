/**
 * Dawah lesson media helpers (frontend mirror of the backend
 * `apps/backend/src/dawah/dawah-media.constants.ts`). Keep the two in sync — the
 * admin preview and the public player MUST derive the same embed URL the backend
 * validated, and the host allowlist here is a UX pre-check (the backend is the
 * real gate).
 *
 * Video is external-URL only (YouTube/Vimeo). Audio is self-hosted and resolved
 * with `fileUrl(mediaKey)` — no helper needed for it here.
 */

const MEDIA_URL_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
  'youtube-nocookie.com', 'www.youtube-nocookie.com',
  'vimeo.com', 'www.vimeo.com', 'player.vimeo.com',
]);

export interface MediaEmbed {
  provider: 'youtube' | 'vimeo';
  id: string;
  /** Canonical, privacy-friendly URL for an <iframe src>. */
  embedUrl: string;
  /** Best-effort poster/thumbnail for the facade (YouTube only; null for Vimeo). */
  thumbnailUrl: string | null;
}

function youtube(id: string): MediaEmbed | null {
  if (!/^[\w-]{6,20}$/.test(id)) return null;
  return {
    provider: 'youtube',
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}
function vimeo(id: string): MediaEmbed | null {
  if (!/^\d+$/.test(id)) return null;
  return {
    provider: 'vimeo',
    id,
    embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1`,
    thumbnailUrl: null, // Vimeo thumbnails need an API call; the facade uses a fallback.
  };
}

/** Parse a raw YouTube/Vimeo URL → provider + id + embed URL, or null if not allowed. */
export function parseMediaEmbed(raw: string | null | undefined): MediaEmbed | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  if (!MEDIA_URL_HOSTS.has(host)) return null;

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return id ? youtube(id) : null;
  }
  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const v = u.searchParams.get('v');
    if (v) return youtube(v);
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    return m ? youtube(m[1]) : null;
  }
  if (host === 'player.vimeo.com') {
    const m = u.pathname.match(/^\/video\/(\d+)/);
    return m ? vimeo(m[1]) : null;
  }
  const m = u.pathname.match(/^\/(\d+)/);
  return m ? vimeo(m[1]) : null;
}

export function isAllowedMediaUrl(raw: string | null | undefined): boolean {
  return parseMediaEmbed(raw) !== null;
}

/** A general https check for `link` lessons (any host, unlike video). */
export function isHttpsUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try { return new URL(raw.trim()).protocol === 'https:'; } catch { return false; }
}
