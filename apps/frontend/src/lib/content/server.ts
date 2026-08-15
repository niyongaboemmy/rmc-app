/**
 * Server-side read of the site-content store.
 *
 * Sections resolve their copy through `usePreviewableContent`, which fetches on
 * mount — so the server-rendered HTML carried the built-in defaults and the saved
 * copy only appeared after hydration. Every visitor saw a flash of the seeded text,
 * and crawlers (and anyone without JS) saw nothing else. In a translated locale
 * that is especially misleading: the seeded Kinyarwanda copy is complete, so the
 * first paint looks correct while showing text an admin edited months ago.
 *
 * A page calls this in its server component and hands the result to
 * `SiteContentProvider`; `usePreviewableContent` then seeds its initial state from
 * that map and skips the redundant mount fetch. One request replaces the ~11 the
 * home page used to fire, and the saved copy is in the HTML.
 *
 * Deliberately NOT re-exported from `@/lib/content-api`: that barrel is also
 * imported by the NestJS seed scripts, and this module is server-render plumbing.
 * Import it directly from a server component.
 */

import { cache } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/** Saved section blobs by `ContentKeys` value. A missing key means "never saved". */
export type SiteContentMap = Record<string, unknown>;

/**
 * The whole store, fetched at most once per request.
 *
 * The endpoint returns every section in one response, and both the locale layout and
 * the page inside it need some of it — so without this they each fired their own
 * round-trip for the same payload. `cache()` keys on arguments, which is why the
 * dedupe lives in this no-arg function rather than on `fetchSiteContent`: two callers
 * asking for different key lists would miss each other's cache entry.
 *
 * Never throws — an unreachable or slow backend resolves to `{}`, which leaves every
 * section on its built-in defaults exactly as a failed client-side fetch does.
 *
 * Uncached at the HTTP layer (`no-store`): this is admin-editable copy, and a stale
 * window would look like the very "my edit didn't save" bug that motivated rendering
 * it server-side. The call is bounded to 8s, matching the client's read timeout.
 */
const fetchAllSiteContent = cache(async (): Promise<SiteContentMap> => {
  try {
    const res = await fetch(`${API_URL}/content`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return {};

    const body = (await res.json()) as { data?: SiteContentMap } | null;
    return body?.data ?? {};
  } catch {
    return {};
  }
});

/**
 * The saved blobs for `keys`. Never throws — see {@link fetchAllSiteContent}.
 *
 * Call it freely: several callers in one request share a single round-trip, so a page
 * asking for its own sections costs nothing beyond the layout's call.
 */
export async function fetchSiteContent(keys: readonly string[]): Promise<SiteContentMap> {
  const all = await fetchAllSiteContent();

  // Only the requested sections — the full store carries every page's copy, and all
  // of it would otherwise be serialised into this page's HTML payload.
  const wanted: SiteContentMap = {};
  for (const key of keys) {
    if (all[key] !== undefined) wanted[key] = all[key];
  }
  return wanted;
}
