'use client';

/**
 * Live-preview plumbing for the admin in-context content editor.
 *
 * Public landing sections normally fetch their content once on mount via
 * `getSiteContent` and fall back to built-in defaults. The admin "Live Editor"
 * (`/admin/content/live`) renders those very same section components inside a
 * `PreviewProvider`, so an admin can edit a section and watch the real component
 * update as they type — then Save.
 *
 * The contract is deliberately one-directional and opt-in:
 *
 *  - `usePreviewableContent(key, defaults)` replaces the repeated
 *    fetch-once-then-merge boilerplate in each blob section. Outside a provider
 *    (i.e. the public site) it behaves EXACTLY like before: fetch once, merge
 *    over defaults. Inside the editor it also honours a live in-memory override
 *    (what the admin is currently typing) and re-fetches when a save bumps the
 *    refresh signal.
 *
 *  - `useEditorRefreshKey()` gives collection sections (announcements, tenders,
 *    …) — which fetch lists through their own API modules, not `getSiteContent`
 *    — a value to add to their fetch effect deps so they re-pull after an edit
 *    is saved. On the public site it is a constant `0`, so nothing changes.
 *
 * No public component changes behaviour when rendered outside a provider.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSiteContent, mergeContent } from './client';
import { useServerSiteContent } from './SiteContentProvider';

type Listener = () => void;

/**
 * In-memory store shared between the editor drawer (writer) and the previewed
 * section components (readers). One instance lives per Live Editor page.
 */
class PreviewStore {
  private overrides = new Map<string, unknown>();
  private refreshKey = 0;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }

  /** The value the admin is currently editing for `key`, or undefined when idle. */
  getOverride(key: string): unknown {
    return this.overrides.get(key);
  }

  hasOverride(key: string): boolean {
    return this.overrides.has(key);
  }

  /** Push the in-progress edit so previewing sections re-render live. */
  setOverride(key: string, value: unknown): void {
    this.overrides.set(key, value);
    this.emit();
  }

  /** Drop the in-progress edit (on save/discard) so the section shows saved data. */
  clearOverride(key: string): void {
    if (this.overrides.delete(key)) this.emit();
  }

  getRefreshKey(): number {
    return this.refreshKey;
  }

  /** Signal collection sections to re-fetch (e.g. after a create/edit/delete save). */
  bumpRefresh(): void {
    this.refreshKey += 1;
    this.emit();
  }
}

export type { PreviewStore };

export function createPreviewStore(): PreviewStore {
  return new PreviewStore();
}

const PreviewContext = createContext<PreviewStore | null>(null);

export function PreviewProvider({
  store,
  children,
}: {
  store: PreviewStore;
  children: React.ReactNode;
}) {
  return <PreviewContext.Provider value={store}>{children}</PreviewContext.Provider>;
}

/** The active preview store, or null when rendered on the public site. */
export function usePreviewStore(): PreviewStore | null {
  return useContext(PreviewContext);
}

/** Subscribe a component to store changes (override edits + refresh bumps). */
function useStoreTick(store: PreviewStore | null): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!store) return;
    return store.subscribe(() => setTick((n) => n + 1));
  }, [store]);
  return tick;
}

/**
 * Blob-section content hook. Drop-in replacement for the manual
 * `useEffect(getSiteContent → mergeContent(DEFAULT, data))` pattern.
 *
 * When the page wrapped its tree in a `SiteContentProvider` the saved blob is
 * already present on the first render — server-side included — so the section's
 * real copy lands in the server-rendered HTML instead of appearing a beat after
 * hydration. Without a provider this fetches on mount exactly as it always did.
 */
export function usePreviewableContent<T>(key: string, defaults: T): T {
  return usePreviewableContentState(key, defaults).content;
}

export interface PreviewableContentState<T> {
  /** Merged section content — always usable, defaults until something better arrives. */
  content: T;
  /**
   * False only while a first client-side read is still in flight. Already true on the
   * very first render when the page server-rendered this section, which is what lets
   * a caller drop its loading skeleton instead of flashing one over content it
   * already has.
   */
  ready: boolean;
}

/**
 * {@link usePreviewableContent} plus a readiness flag, for sections that render a
 * skeleton rather than their defaults while loading.
 */
export function usePreviewableContentState<T>(key: string, defaults: T): PreviewableContentState<T> {
  const store = usePreviewStore();
  useStoreTick(store); // re-render on override / refresh changes (no-op when public)

  const server = useServerSiteContent<T>(key);
  const [fetched, setFetched] = useState<T | null>(server.value);
  const [ready, setReady] = useState(server.provided);
  // The server already resolved this section, so the fetch this effect would run on
  // mount is redundant. Skip that one only — a later refreshKey bump (a publish)
  // still re-pulls, which is how the editor sees its own save land.
  const skipMountFetch = useRef(server.provided);
  const refreshKey = store?.getRefreshKey() ?? 0;

  useEffect(() => {
    if (skipMountFetch.current) {
      skipMountFetch.current = false;
      return;
    }
    let active = true;
    getSiteContent<T>(key)
      .then((data) => {
        if (active && data) setFetched(data);
      })
      .catch(() => {
        /* keep defaults — the section simply hasn't been saved yet */
      })
      .finally(() => {
        // Settled either way: a section that has never been saved is as resolved as
        // one that loaded, and both should stop showing a skeleton.
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
    // Re-fetch when a save bumps refreshKey so the section shows persisted data.
  }, [key, refreshKey]);

  const override = store?.getOverride(key);
  const content =
    override !== undefined ? mergeContent(defaults, override) : mergeContent(defaults, fetched);

  return { content, ready };
}

/**
 * Refresh signal for collection sections that fetch through their own API
 * modules. Add the returned value to the fetch effect's dependency array.
 * Returns a constant `0` outside the editor, so the public site is unaffected.
 */
export function useEditorRefreshKey(): number {
  const store = usePreviewStore();
  useStoreTick(store);
  return store?.getRefreshKey() ?? 0;
}
