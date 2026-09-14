// `import * as`, NOT a default import. This tsconfig sets
// allowSyntheticDefaultImports WITHOUT esModuleInterop, so
// `import sanitizeHtml from 'sanitize-html'` typechecks perfectly and is
// `undefined` at runtime — the emitted CJS has no interop helper, and the first
// sign is a 500 on every program save. sanitize-html is `export =`; this is the
// honest way to reach it. Same note as discussions-markdown.ts, same reason.
import * as sanitizeHtml from 'sanitize-html';

/**
 * Cleans the rich-text description an admin writes for a scholarship.
 *
 * ── Why this exists at all ───────────────────────────────────────────────────
 *
 * The description used to be plain text, rendered as `{description}` in JSX,
 * which React escapes — safe by construction. Migration 077 made it rich text,
 * and the detail page now renders it with `dangerouslySetInnerHTML`. That turns
 * an ordinary column into an XSS sink, so something has to clean it.
 *
 * ── Why HERE and not at render ───────────────────────────────────────────────
 *
 * The obvious place is the frontend's `lib/sanitize`, which is what every other
 * rich-text surface uses. It cannot be: it bundles jsdom, its own header says it
 * must never be imported from a `'use client'` module, and the scholarship
 * detail page fetches its programme in the browser — so there is no server
 * component in the path to pre-sanitise and hand the clean HTML down, the way
 * the hajj and funeral pages do.
 *
 * Sanitising at the API boundary is the stronger answer anyway: every consumer
 * gets safe HTML, not just the one page that remembered to ask.
 *
 * ── Why a separate module ────────────────────────────────────────────────────
 *
 * `sanitize-html` is ESM-only and this project's Jest runs CJS, so anything that
 * imports it cannot be loaded by a spec. Isolating it here means
 * scholarship.service.spec.ts can mock this one module — the same split, for the
 * same reason, as dawah's `discussions-markdown`.
 *
 * ── The allowlist ────────────────────────────────────────────────────────────
 *
 * Matches what the shared RichTextEditor can actually produce, and mirrors the
 * dawah answer allowlist. A tag omitted here is not demoted, it is DESTROYED —
 * sanitize-html drops the tag and keeps the text — so an admin's heading would
 * silently become a paragraph with nothing to tell them. That has bitten this
 * codebase twice; all six heading levels are listed because the toolbar offers
 * all six.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'hr',
  'img',
];

/**
 * Whether an image source is one the browser can actually draw.
 *
 * Stripping `onerror` neutralises `<img src=x onerror="…">` but leaves the inert
 * `<img src="x">`, which renders as a broken-image icon in the middle of a
 * scholarship description — residue from an attempt, shown to applicants. The
 * frontend sanitiser drops these for the same reason; this keeps the two
 * agreeing rather than leaving the API the laxer of the pair.
 */
function isRenderableImgSrc(src: string): boolean {
  return /^https?:\/\//i.test(src) || /^data:image\//i.test(src);
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    // The editor carries image sizing and alignment as data-attributes, styled
    // once in globals.css so the editor and the public page agree. Dropping them
    // would silently reset every image to full-width centre.
    img: ['src', 'alt', 'data-size', 'data-align'],
  },
  // `data:` matters for links as well as images: `[click](data:text/html;…)` is
  // a same-origin XSS. Images may use it; links may not.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // A protocol-relative //evil.com inherits our scheme and is a real link out.
  allowProtocolRelative: false,
  // Strip the CONTENT of these, not just the tags — otherwise
  // `<script>alert(1)</script>` becomes the visible text "alert(1)".
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'iframe'],
  // Runs after attributes are filtered, so it sees the src that survived.
  exclusiveFilter: (frame) => frame.tag === 'img' && !isRenderableImgSrc(frame.attribs?.src ?? ''),
  transformTags: {
    // Written out rather than sanitizeHtml.simpleTransform(): that helper hangs
    // off the CJS export and does not survive this project's import interop —
    // it arrives undefined at runtime while typechecking clean.
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        rel: 'nofollow ugc noopener noreferrer',
        target: '_blank',
      },
    }),
  },
};

/** One rich-text value, cleaned. Null and undefined pass through unchanged. */
export function sanitizeDescription<T extends string | null | undefined>(html: T): T {
  if (html == null || html === '') return html;
  return sanitizeHtml(html, OPTIONS) as T;
}

/**
 * The trilingual form of the same, tolerant of a partially filled object.
 *
 * Constrained to `object` rather than `Record<string, string>`: `I18nText` is an
 * interface, and an interface has no implicit index signature, so the tighter
 * constraint rejects the exact type this is called with. Values are checked
 * individually instead, which is where the real guarantee belongs anyway.
 */
export function sanitizeDescriptionI18n<T extends object>(
  value: T | null | undefined,
): T | null | undefined {
  if (!value) return value;
  const out: Record<string, unknown> = {};
  for (const [lang, text] of Object.entries(value)) {
    out[lang] = typeof text === 'string' ? sanitizeHtml(text, OPTIONS) : text;
  }
  return out as T;
}
