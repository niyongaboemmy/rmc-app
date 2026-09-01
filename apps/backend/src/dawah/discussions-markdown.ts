import { marked } from 'marked';
// `import * as`, NOT a default import. This tsconfig sets allowSyntheticDefaultImports
// WITHOUT esModuleInterop, so `import sanitizeHtml from 'sanitize-html'` typechecks
// perfectly and is `undefined` at runtime — the emitted CJS has no interop helper.
// sanitize-html is `export =`; this is the honest way to reach it.
import * as sanitizeHtml from 'sanitize-html';
import { addHeadingAnchors, type TocEntry } from './discussions-toc';

/**
 * The Discussions markdown pipeline: a stranger's markdown → HTML nobody can be hurt by.
 *
 * ── Why this file exists at all ──────────────────────────────────────────────────────
 *
 * Every other rich text in this app was typed by an admin. This is the first surface
 * where an untrusted stranger's text is stored and shown to other members, so the threat
 * model is different in kind, not degree. Two rules follow, and both are load-bearing:
 *
 * 1. WE STORE MARKDOWN, NOT HTML. If we accepted HTML, the entire defence would be
 *    "the sanitiser never has a bug". Markdown source is inert bytes: even if this
 *    renderer were bypassed tomorrow, what sits in the database cannot execute.
 *
 * 2. WE SANITISE ON THE WAY OUT, NOT ON THE WAY IN. Input-time sanitising freezes
 *    today's library version into the database — a bypass found next year is already
 *    stored, in thousands of rows, and no upgrade can save you. Render-time sanitising is
 *    fixed by `npm update`.
 *
 * This is not theoretical here: seeded `<img src=x onerror=...>` payloads survived in
 * `dawah_courses.description` and rendered on the live public course page. That was
 * ADMIN content. This feature invites the payload.
 *
 * ── Why the allowlist is this small ─────────────────────────────────────────────────
 *
 * No images: an <img> in a public post is an IP-address logger pointed at everyone who
 * reads a religious question — including the anonymous sister who asked it. No iframes,
 * no embeds, no styles, no ids. Phase A ships the smallest surface that is still a
 * usable forum post; anything else must be argued for on its own merits.
 */

/** Tags a member may produce. Everything else is stripped, text kept. */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'del',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  // h1 belongs to the page — it is the question's title. h2 down to h4 are the
  // answer's own structure. h2 was excluded when this was a member forum post
  // nested inside a page; an admin-authored ANSWER is the page's main content, so
  // its top-level heading IS h2. Leaving it out did not demote such a heading, it
  // DESTROYED it: sanitize-html discards the tag and keeps the text, so an admin
  // using the editor's "Heading 2" button silently got a bare paragraph.
  'h2',
  'h3',
  'h4',
  'a',
  'hr',
];

/**
 * Schemes a link may use. `javascript:` is the obvious one; `data:` is the one people
 * forget — `[click](data:text/html;base64,...)` is a same-origin XSS in a link.
 */
const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
  },
  allowedSchemes: ALLOWED_SCHEMES,
  // A protocol-relative //evil.com inherits our scheme and is a real link out.
  allowProtocolRelative: false,
  // Strip the CONTENT of these, not just the tags — otherwise `<script>alert(1)</script>`
  // becomes the visible text "alert(1)", which is noise at best and a phishing vector at
  // worst.
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'iframe'],
  transformTags: {
    /**
     * `# Heading` becomes an h2 rather than being thrown away.
     *
     * h1 is not on the allowlist, and a disallowed tag is DISCARDED with its text
     * kept — so a stray `#` silently became a paragraph, exactly as `## ` did
     * before h2 was allowed. The reason for excluding it stands: h1 belongs to the
     * page, which here is the question's title, and a second one inside the answer
     * would give the document two top-level headings. Mapping it down honours both
     * — the outline stays correct AND the writer's heading survives.
     */
    h1: () => ({ tagName: 'h2', attribs: {} }),

    // Every outbound link, without exception:
    //   nofollow → a spammer's SEO payload is worthless, which is why they leave
    //   ugc      → tells search engines this is user content, not RMC's word
    //   noopener → the opened page cannot reach back through window.opener
    // Written out rather than sanitizeHtml.simpleTransform(): the helper hangs off the
    // CJS export and does not survive this project's import interop — it arrives
    // undefined at runtime while typechecking clean, which is the worst kind of bug.
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

/**
 * Render a stored markdown post to sanitised HTML.
 *
 * Order matters: markdown FIRST, sanitise SECOND. `marked` happily passes raw HTML
 * through (a member typing `<script>` in their markdown), so sanitising before rendering
 * would clean the markdown and then hand the output straight back to the attacker.
 * Sanitising last means whatever `marked` emits — however it got there — faces the
 * allowlist.
 */
export function renderPostMarkdown(source: string | null | undefined): string {
  if (!source?.trim()) return '';

  const rendered = marked.parse(source, {
    async: false,
    // GitHub-flavoured line breaks: members write like they text, not like they write
    // Markdown, and a post that collapses its own line breaks reads as broken.
    breaks: true,
    gfm: true,
  }) as string;

  return sanitizeHtml(rendered, SANITIZE_OPTIONS);
}

/**
 * Plain text for meta descriptions, search snippets and JSON-LD.
 * Renders, strips every tag, collapses whitespace — never a substring of raw markdown,
 * which would slice a link in half and leak the syntax.
 */
export function postExcerpt(source: string | null | undefined, max = 160): string {
  const text = sanitizeHtml(renderPostMarkdown(source), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function renderAnswerWithToc(source: string | null | undefined): {
  html: string;
  toc: TocEntry[];
} {
  // Sanitise FIRST, stamp SECOND. The order is the security property, which is why
  // it is two named steps here rather than one function doing both.
  return addHeadingAnchors(renderPostMarkdown(source));
}
