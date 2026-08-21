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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSiteContent, mergeContent } from './client';

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
 */
export function usePreviewableContent<T>(key: string, defaults: T): T {
  const store = usePreviewStore();
  useStoreTick(store); // re-render on override / refresh changes (no-op when public)

  const [fetched, setFetched] = useState<T | null>(null);
  const refreshKey = store?.getRefreshKey() ?? 0;

  useEffect(() => {
    let active = true;
    getSiteContent<T>(key)
      .then((data) => {
        if (active && data) setFetched(data);
      })
      .catch(() => {
        /* keep defaults — the section simply hasn't been saved yet */
      });
    return () => {
      active = false;
    };
    // Re-fetch when a save bumps refreshKey so the section shows persisted data.
  }, [key, refreshKey]);

  const override = store?.getOverride(key);
  if (override !== undefined) return mergeContent(defaults, override);
  return mergeContent(defaults, fetched);
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
