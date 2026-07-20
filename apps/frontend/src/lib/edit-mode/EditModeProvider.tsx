'use client';

/**
 * In-context "Edit Mode" — the super-admin content editor that runs on the REAL
 * public pages instead of a separate admin screen.
 *
 * A super-admin flips Edit Mode on from the navbar; every admin-managed piece of
 * text on the page becomes click-to-edit in place (see `InlineText`), and a
 * floating bar (see `EditModeBar`) publishes or discards the batch of edits.
 *
 * How it hangs together:
 *
 *  - This provider owns a single {@link PreviewStore} (the same store the admin
 *    Live Editor uses) and mounts it via `PreviewProvider`, so the existing
 *    `usePreviewableContent` in each section reflects in-progress edits live.
 *  - Sections opt in through {@link useEditableContent}, which writes drafts into
 *    that store as per-section overrides and registers the section key as dirty.
 *  - On Publish, every dirty key's override is persisted with `saveSiteContent`.
 *  - On Discard, overrides are cleared and `seedVersion` bumps so the editable
 *    fields re-seed from the saved content.
 *
 * The whole thing is gated on `canEdit` (super-admin). For everyone else the
 * provider is inert: `editMode` can never turn on, no override is ever written,
 * and the page behaves exactly as it does today.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { saveSiteContent } from '@/lib/content-api';
import {
  PreviewProvider,
  createPreviewStore,
  type PreviewStore,
} from '@/lib/content/preview-store';

const STORAGE_KEY = 'rmc_edit_mode';

interface EditModeContextValue {
  /** True only for a super-admin — the sole gate for the whole feature. */
  canEdit: boolean;
  /** Whether in-context editing affordances are currently active. */
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  toggleEditMode: () => void;
  /** The shared preview store (drafts live here as section overrides). */
  store: PreviewStore | null;
  /** Section keys with unsaved edits. */
  dirtyKeys: string[];
  registerDirty: (key: string) => void;
  /** Bumped on publish/discard to force editable fields to re-seed. */
  seedVersion: number;
  saving: boolean;
  /** Persist every dirty section. Resolves to true when all saved. */
  saveAll: () => Promise<boolean>;
  /** Drop all unsaved edits and revert the page to saved content. */
  discardAll: () => void;
}

const noop = () => {};
const DEFAULT: EditModeContextValue = {
  canEdit: false,
  editMode: false,
  setEditMode: noop,
  toggleEditMode: noop,
  store: null,
  dirtyKeys: [],
  registerDirty: noop,
  seedVersion: 0,
  saving: false,
  saveAll: async () => true,
  discardAll: noop,
};

const EditModeContext = createContext<EditModeContextValue>(DEFAULT);

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth();
  const storeRef = useRef<PreviewStore | null>(null);
  if (storeRef.current === null) storeRef.current = createPreviewStore();
  const store = storeRef.current;

  const [editMode, setEditModeState] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [seedVersion, setSeedVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  const canEdit = isSuperAdmin;

  // Restore the last edit-mode preference for this session (super-admin only).
  useEffect(() => {
    if (!canEdit) {
      setEditModeState(false);
      return;
    }
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1') {
      setEditModeState(true);
    }
  }, [canEdit]);

  const setEditMode = useCallback(
    (on: boolean) => {
      if (on && !canEdit) return; // hard gate — non-admins can never enter
      setEditModeState(on);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, on ? '1' : '0');
      }
    },
    [canEdit],
  );

  const toggleEditMode = useCallback(() => setEditMode(!editMode), [editMode, setEditMode]);

  const registerDirty = useCallback((key: string) => {
    setDirty((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const discardAll = useCallback(() => {
    dirty.forEach((key) => store.clearOverride(key));
    setDirty(new Set());
    setSeedVersion((v) => v + 1); // remount editables → re-seed from saved content
  }, [dirty, store]);

  const saveAll = useCallback(async (): Promise<boolean> => {
    const keys = Array.from(dirty);
    if (keys.length === 0) return true;
    setSaving(true);
    let allOk = true;
    for (const key of keys) {
      const value = store.getOverride(key);
      if (value === undefined) continue;
      try {
        await saveSiteContent(key, value);
      } catch {
        allOk = false;
      }
    }
    // Keep overrides in place — they already equal what we just persisted, so the
    // page keeps showing the freshly-saved copy without a refetch flicker. Signal
    // collection sections to re-pull, and clear the dirty set on full success.
    store.bumpRefresh();
    if (allOk) setDirty(new Set());
    setSaving(false);
    return allOk;
  }, [dirty, store]);

  const value = useMemo<EditModeContextValue>(
    () => ({
      canEdit,
      editMode: editMode && canEdit,
      setEditMode,
      toggleEditMode,
      store,
      dirtyKeys: Array.from(dirty),
      registerDirty,
      seedVersion,
      saving,
      saveAll,
      discardAll,
    }),
    [canEdit, editMode, setEditMode, toggleEditMode, store, dirty, registerDirty, seedVersion, saving, saveAll, discardAll],
  );

  return (
    <EditModeContext.Provider value={value}>
      <PreviewProvider store={store}>{children}</PreviewProvider>
    </EditModeContext.Provider>
  );
}

export function useEditMode(): EditModeContextValue {
  return useContext(EditModeContext);
}
