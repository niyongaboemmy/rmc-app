import { BadRequestException } from '@nestjs/common';
import { LessonContentType } from './entities/dawah-course-lesson.entity';

/**
 * Dawah lesson media contract (Phase A). Two hosting paths, one per content type:
 *   • audio → SELF-HOSTED. Uploaded to the PUBLIC `dawah-media/` file-server
 *     prefix and served directly (the file-server range-streams it). `media_key`.
 *   • video → EXTERNAL only. A YouTube/Vimeo URL in `media_url`; we never host
 *     video bytes. Rendered as a facade embed.
 *
 * This module is the single source of truth the DTO/service validate against and
 * the frontend mirrors (`apps/frontend/src/lib/dawah/media.ts` — keep in sync).
 */

// ── Upload (audio only) ──────────────────────────────────────────────────────
/** PUBLIC prefix — do NOT add to the file-server's DEFAULT_PROTECTED_PREFIXES. */
export const DAWAH_MEDIA_FOLDER = 'dawah-media';

/**
 * 90 MB. Sits under the production nginx `client_max_body_size` (100 MB, incl.
 * multipart envelope) so a real upload never 413s before reaching the app. Raise
 * this AND the nginx cap together if longer recordings are needed.
 */
export const MEDIA_MAX_BYTES = 90 * 1024 * 1024;

/**
 * Uploadable lesson media MIME allowlist: audio (for `audio` lessons) and PDF
 * (for `pdf` lessons). Video is a URL, never uploaded — no video types here.
 */
export const MEDIA_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a',
  'audio/x-wav',
  'application/pdf',
];

/** A general https URL check for `link` lessons (any host, unlike video). */
export function isHttpsUrl(raw: string): boolean {
  try {
    return new URL(raw.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

// ── External video URL allowlist + canonical embed derivation ────────────────
const MEDIA_URL_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
]);

export interface MediaEmbed {
  provider: 'youtube' | 'vimeo';
  id: string;
  /** Canonical, privacy-friendly embed URL for an <iframe src>. */
  embedUrl: string;
}

function youtube(id: string): MediaEmbed | null {
  if (!/^[\w-]{6,20}$/.test(id)) return null;
  return {
    provider: 'youtube',
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  };
}
function vimeo(id: string): MediaEmbed | null {
  if (!/^\d+$/.test(id)) return null;
  return { provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}` };
}

/**
 * Parse a raw admin-entered URL into a provider + id + canonical embed URL.
 * Returns null for anything not an https YouTube/Vimeo link on the allowlist.
 * Store the RAW url; derive the embed at render. BE and FE must agree — this is
 * mirrored verbatim in the frontend.
 */
export function parseMediaEmbed(raw: string): MediaEmbed | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
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
  // vimeo.com / www.vimeo.com
  const m = u.pathname.match(/^\/(\d+)/);
  return m ? vimeo(m[1]) : null;
}

export function isAllowedMediaUrl(raw: string): boolean {
  return parseMediaEmbed(raw) !== null;
}

// ── Content-type ⇄ media invariant (DB-1 §2) ─────────────────────────────────
interface LessonMedia {
  contentType: LessonContentType;
  mediaKey: string | null;
  mediaUrl: string | null;
}

/**
 * Enforce the content-type⇄media rules and clear irrelevant columns, in place.
 * - text  → both media columns nulled.
 * - video → requires an allowlisted media_url; media_key nulled.
 * - audio → requires a media_key; media_url nulled.
 * - pdf/link (Phase B) → left as provided.
 * Throws 400 on a missing/invalid required field. Applied on every create/update
 * so a retyped lesson can never keep a stale/dangling media reference.
 */
export function applyLessonMediaInvariants<T extends LessonMedia>(lesson: T): T {
  switch (lesson.contentType) {
    case LessonContentType.TEXT:
      lesson.mediaKey = null;
      lesson.mediaUrl = null;
      break;
    case LessonContentType.VIDEO:
      if (!lesson.mediaUrl) {
        throw new BadRequestException('A video lesson needs a YouTube or Vimeo link.');
      }
      if (!isAllowedMediaUrl(lesson.mediaUrl)) {
        throw new BadRequestException('The video link must be an https YouTube or Vimeo URL.');
      }
      lesson.mediaKey = null;
      break;
    case LessonContentType.AUDIO:
      if (!lesson.mediaKey) {
        throw new BadRequestException('An audio lesson needs an uploaded audio file.');
      }
      lesson.mediaUrl = null;
      break;
    case LessonContentType.PDF:
      if (!lesson.mediaKey) {
        throw new BadRequestException('A PDF lesson needs an uploaded PDF file.');
      }
      lesson.mediaUrl = null;
      break;
    case LessonContentType.LINK:
      if (!lesson.mediaUrl) {
        throw new BadRequestException('A link lesson needs a URL.');
      }
      if (!isHttpsUrl(lesson.mediaUrl)) {
        throw new BadRequestException('The link must be an https URL.');
      }
      lesson.mediaKey = null;
      break;
    default:
      break;
  }
  return lesson;
}
