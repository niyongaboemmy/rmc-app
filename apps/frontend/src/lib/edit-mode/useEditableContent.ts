'use client';

/**
 * Section-level glue for in-context Edit Mode.
 *
 * Drop-in companion to `usePreviewableContent`: a section calls this instead and
 * gets back the same merged `content` it always had, plus an `editing` flag and
 * a `setField` mutator. `setField` writes the edited draft into the shared
 * preview store as this section's override — which is exactly what
 * `usePreviewableContent` reads — so the live section re-renders as the admin
 * types, and the floating bar can publish it.
 *
 * Outside Edit Mode (the public site, or any non-super-admin) `editing` is false
 * and `setField` is never called, so behaviour is identical to before.
 */

import { useCallback } from 'react';
import { usePreviewableContent, usePreviewStore } from '@/lib/content/preview-store';
import { useEditMode } from './EditModeProvider';

export interface EditableContent<T> {
  /** Merged section content, reflecting any in-progress edit live. */
  content: T;
  /** True when this section should render click-to-edit affordances. */
  editing: boolean;
  /**
   * Apply an edit. The callback receives a deep clone of the current draft to
   * mutate in place; the result becomes the new live + saveable value.
   */
  setField: (mutator: (draft: T) => void) => void;
}

/** Structured-content deep clone (values are plain JSON: strings/numbers/arrays/objects). */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function useEditableContent<T>(key: string, defaults: T): EditableContent<T> {
  const content = usePreviewableContent<T>(key, defaults);
  const store = usePreviewStore();
  const { editMode, canEdit, registerDirty } = useEditMode();

  const editing = editMode && canEdit && !!store;

  const setField = useCallback(
    (mutator: (draft: T) => void) => {
      if (!store) return;
      // Base off the live override when present, else the merged content, so
      // successive edits accumulate on the same draft.
      const base = (store.getOverride(key) as T | undefined) ?? content;
      const next = clone(base);
      mutator(next);
      store.setOverride(key, next);
      registerDirty(key);
    },
    [store, key, content, registerDirty],
  );

  return { content, editing, setField };
}
