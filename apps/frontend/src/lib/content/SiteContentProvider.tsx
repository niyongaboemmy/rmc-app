'use client';

/**
 * Carries server-fetched section content into the client tree.
 *
 * A page fetches its sections with `fetchSiteContent` (see `./server`) and wraps
 * its children in this provider. `usePreviewableContent` reads the map through
 * {@link useServerSiteContent} to seed its initial state, so the section renders
 * its saved copy in the server-rendered HTML instead of flashing the defaults.
 *
 * Outside a provider the hook reports `provided: false` and every consumer keeps
 * its original fetch-on-mount behaviour, so pages adopt this one at a time.
 *
 * Providers NEST: the locale layout provides the keys the shared chrome needs (the
 * footer's social links and contact details, the page heroes) and a page provides
 * its own sections on top. An inner provider therefore MERGES over the outer map
 * rather than replacing it — replacing it would hide the layout's keys from the
 * footer rendered inside that page, silently re-breaking what the layout fixed.
 *
 * Deliberately NOT re-exported from `@/lib/content-api` — that barrel is imported
 * by the NestJS seed scripts, and pulling JSX into that Node compile breaks it.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { SiteContentMap } from './server';

const SiteContentContext = createContext<SiteContentMap | null>(null);

export function SiteContentProvider({
  content,
  children,
}: {
  content: SiteContentMap;
  children: React.ReactNode;
}) {
  const outer = useContext(SiteContentContext);
  // Inner keys win on collision — a page asking for a section explicitly is more
  // specific than the layout's shared set.
  const merged = useMemo(
    () => (outer ? { ...outer, ...content } : content),
    [outer, content],
  );

  return <SiteContentContext.Provider value={merged}>{children}</SiteContentContext.Provider>;
}

export interface ServerSiteContent<T> {
  /** The saved blob, or null when this section has never been saved. */
  value: T | null;
  /**
   * Whether a server-rendered map was available at all. False outside a provider,
   * where `value` is always null and the caller must fetch for itself. True with a
   * null `value` is meaningful: the server looked and the section is genuinely
   * unset, so there is nothing to fetch.
   */
  provided: boolean;
}

/** The server-rendered blob for `key`. */
export function useServerSiteContent<T>(key: string): ServerSiteContent<T> {
  const map = useContext(SiteContentContext);
  if (!map) return { value: null, provided: false };
  return { value: (map[key] as T | undefined) ?? null, provided: true };
}
