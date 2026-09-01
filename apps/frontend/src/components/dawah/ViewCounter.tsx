'use client';

import { useEffect, useRef } from 'react';

import { dawahApi } from '@/lib/dawahApi';

/**
 * Records that this entry was read.
 *
 * ── Why this is not done on the server ──────────────────────────────────────
 *
 * It was, inside `bySlug`, and that counted a view every time the page was
 * RENDERED — which is not the same as read. Next.js prefetches this route's
 * payload when a card is hovered or scrolled into view on the listing, and each
 * prefetch server-rendered the page and bumped the counter. Scrolling past the
 * feed inflated every entry, and two entries created in an afternoon reached
 * thirty views without being opened.
 *
 * A prefetch does not run effects. Moving the call here means the count follows
 * a browser that actually rendered the page for somebody.
 *
 * ── Once per mount, deliberately ────────────────────────────────────────────
 *
 * The ref guard is for React's development StrictMode, which invokes effects
 * twice on purpose — without it every local page load counted two. It is NOT an
 * attempt to make views unique per reader: a reload counts again, which is the
 * ordinary meaning of a view count.
 *
 * Failure is silent. The number is a statistic; the answer is the product, and a
 * reader must never see anything go wrong because a counter did.
 */
export function ViewCounter({ slug }: { slug: string }) {
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    void dawahApi.discussions.recordView(slug).catch(() => undefined);
  }, [slug]);

  return null;
}
