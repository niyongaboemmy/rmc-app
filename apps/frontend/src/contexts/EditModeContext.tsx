'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { getSiteContent, saveSiteContent, mergeContent, pick } from '@/lib/content-api';

/**
 * In-place ("visual") editing for a single `site_content` section.
 *
 * A page wraps the subtree it wants editable in `<EditModeProvider>` and drops
 * `<EditableText path="…">` anchors wherever copy should be clickable. The
 * provider owns three things:
 *
 *   1. the edit-mode toggle (`editing`) — chrome that only `canEdit` users see;
 *   2. a live draft of the section's content, edited by dotted path + locale;
 *   3. persistence back to `PUT /content/:key` (gated server-side by
 *      `content:edit`, mirrored here by `canSave`).
 *
 * It is deliberately generic: it knows nothing about the library, books, or any
 * particular schema. The content shape is owned by the caller's `defaults`, and
 * fields are addressed by string path so the context type stays schema-free.
 *
 * `canEdit` (may toggle the toolbar at all) and `canSave` (may persist copy) are
 * decided by the page from `useAuth`, not here — a page may want the toolbar
 * open for a books-only manager who cannot touch the prose.
 */

type Json = Record<string, unknown>;

interface EditModeValue {
  /** Whether the visual editor is currently switched on. */
  editing: boolean;
  setEditing: (v: boolean) => void;
  /** May this user open the editor at all (show the toolbar)? */
  canEdit: boolean;
  /** May this user persist copy edits? When false, text stays read-only. */
  canSave: boolean;
  /** Initial section fetch still in flight. */
  loading: boolean;
  saving: boolean;
  /** Draft differs from the last-saved baseline. */
  dirty: boolean;
  /** Read the active-locale string at a dotted path (falls back to English). */
  getText: (path: string, locale: string) => string;
  /** Write the active-locale string at a dotted path. */
  setText: (path: string, locale: string, value: string) => void;
  /** Read the RAW node (object/array/primitive) at a dotted path — for iterating
   *  a repeatable collection's keys/length without knowing its shape up front. */
  getValue: (path: string) => unknown;
  /** Write a RAW node at a dotted path (e.g. append an item to an array). */
  setValue: (path: string, value: unknown) => void;
  /** Delete the node at a dotted path (array item spliced, object key removed). */
  removeAt: (path: string) => void;
  save: () => Promise<void>;
  discard: () => void;
}

const EditModeContext = createContext<EditModeValue | null>(null);

export function useEditMode(): EditModeValue {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error('useEditMode must be used within an EditModeProvider');
  return ctx;
}

function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc == null ? undefined : (acc as Json)[key]),
    obj,
  );
}

/** Immutable set: returns a structurally-shared clone with `value` at `path`.
 *  Array-safe — spreading an array into an object would turn `[a,b]` into
 *  `{0:a,1:b}` and silently break every array field, so arrays clone as arrays. */
function setAtPath(obj: unknown, path: string[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const clone: Record<string, unknown> | unknown[] = Array.isArray(obj)
    ? [...obj]
    : { ...(obj as Json) };
  (clone as Record<string, unknown>)[head] = setAtPath((clone as Record<string, unknown>)[head], rest, value);
  return clone;
}

/** Immutable delete of the node at `path`. An array parent is SPLICED (indices
 *  stay contiguous); an object parent has the key deleted. Used to remove a
 *  repeatable item (e.g. a service requirement) from the draft. */
function removeAtPath(obj: unknown, path: string[]): unknown {
  if (path.length === 0) return obj;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const clone = [...obj];
    const idx = Number(head);
    if (rest.length === 0) clone.splice(idx, 1);
    else clone[idx] = removeAtPath(clone[idx], rest);
    return clone;
  }
  if (obj != null && typeof obj === 'object') {
    const clone: Json = { ...(obj as Json) };
    if (rest.length === 0) delete clone[head];
    else clone[head] = removeAtPath(clone[head], rest);
    return clone;
  }
  return obj;
}

export function EditModeProvider<T extends object>({
  sectionKey,
  defaults,
  canEdit,
  canSave,
  children,
}: {
  sectionKey: string;
  defaults: T;
  canEdit: boolean;
  canSave: boolean;
  children: React.ReactNode;
}) {
  const [editing, setEditingRaw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Json>(defaults as unknown as Json);
  // The last-persisted value; `dirty` is measured against this, not `defaults`.
  const baselineRef = useRef<string>(JSON.stringify(defaults));

  useEffect(() => {
    let cancelled = false;
    getSiteContent<Json>(sectionKey)
      .then((data) => {
        if (cancelled) return;
        const merged = mergeContent(defaults, data) as Json;
        baselineRef.current = JSON.stringify(merged);
        setDraft(merged);
      })
      .catch(() => {
        // Section unset or the read failed — the seeded defaults stand in, and
        // the page renders exactly as it would from the message catalogue.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `defaults`/`sectionKey` are module constants per page; intentionally once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  const dirty = useMemo(() => JSON.stringify(draft) !== baselineRef.current, [draft]);

  const setEditing = useCallback(
    (v: boolean) => {
      if (v && !canEdit) return;
      setEditingRaw(v);
    },
    [canEdit],
  );

  const getText = useCallback(
    (path: string, locale: string) => pick(getAtPath(draft, path) as never, locale),
    [draft],
  );

  const setText = useCallback((path: string, locale: string, value: string) => {
    setDraft((prev) => setAtPath(prev, [...path.split('.'), locale], value) as Json);
  }, []);

  const getValue = useCallback((path: string) => getAtPath(draft, path), [draft]);

  const setValue = useCallback((path: string, value: unknown) => {
    setDraft((prev) => setAtPath(prev, path.split('.'), value) as Json);
  }, []);

  const removeAt = useCallback((path: string) => {
    setDraft((prev) => removeAtPath(prev, path.split('.')) as Json);
  }, []);

  const save = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const saved = await saveSiteContent<Json>(sectionKey, draft);
      // Trust the round-trip: adopt exactly what the server stored as baseline.
      baselineRef.current = JSON.stringify(saved);
      setDraft(saved);
    } finally {
      setSaving(false);
    }
  }, [canSave, saving, sectionKey, draft]);

  const discard = useCallback(() => {
    setDraft(JSON.parse(baselineRef.current) as Json);
  }, []);

  const value = useMemo<EditModeValue>(
    () => ({
      editing, setEditing, canEdit, canSave, loading, saving, dirty,
      getText, setText, getValue, setValue, removeAt, save, discard,
    }),
    [editing, setEditing, canEdit, canSave, loading, saving, dirty, getText, setText, getValue, setValue, removeAt, save, discard],
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}
