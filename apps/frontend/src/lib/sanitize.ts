import DOMPurify from 'isomorphic-dompurify';

/**
 * Server-only rich-text sanitiser for admin-authored HTML (course/book/lesson
 * descriptions, CMS bodies) before it is rendered with dangerouslySetInnerHTML.
 *
 * Bundles jsdom (via isomorphic-dompurify), so this must only be imported from
 * SERVER components — never a 'use client' module (see the note on
 * CourseLessonBrowser). Pre-sanitise on the server and pass plain strings to the
 * client.
 *
 * Beyond DOMPurify's standard XSS stripping, it drops <img> elements that have
 * no renderable source. DOMPurify neutralises a payload like
 * `<img src=x onerror="…">` by removing the handler, but keeps the now-inert
 * `<img src="x">` — which the browser draws as a broken-image icon. Editor
 * content only ever carries real http(s)/data image sources, so anything else
 * is residue and is removed here.
 */
function isRenderableImgSrc(src: string): boolean {
  return /^https?:\/\//i.test(src) || /^data:image\//i.test(src);
}

export function sanitizeRichHtml(html: string | null | undefined): string {
  // The hook is added and removed around this single SYNCHRONOUS sanitize call.
  // DOMPurify hooks are global, but nothing yields between add and remove, so
  // the hook can never leak into another render or another DOMPurify caller.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    if (el.tagName === 'IMG' && !isRenderableImgSrc(el.getAttribute('src') ?? '')) {
      el.parentNode?.removeChild(el);
    }
  });
  try {
    return DOMPurify.sanitize(html ?? '');
  } finally {
    DOMPurify.removeHook('afterSanitizeAttributes');
  }
}
