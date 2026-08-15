'use client';

/**
 * A single click-to-edit text node for in-context Edit Mode.
 *
 * On the public site (and for any non-super-admin) it renders exactly the tag +
 * classes it was given, with the plain `value` inside — zero behavioural change.
 * When a super-admin is in Edit Mode it becomes `contentEditable`, gains a subtle
 * dashed hover outline, and reports edits up through `onCommit`.
 *
 * Seeding: the DOM text is set once on mount and re-seeded only when the element
 * remounts. We force a remount via `key` when the language or the global
 * `seedVersion` changes (publish/discard), but NOT on every keystroke — that is
 * what keeps the caret from jumping while typing.
 */

import React, { useEffect, useRef } from 'react';
import { Permission } from '@/lib/permissions';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';

type Tag = 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';

interface InlineTextProps {
  /** Locale-RESOLVED text — what the public site renders. */
  value: string;
  /**
   * The active locale's OWN text, unresolved. Pass this wherever `value` came from
   * `pick()`/`pickLang()`: the edit box then opens empty (showing `placeholder`) for
   * a field with no copy in this locale, instead of presenting the English fallback
   * as though it were a translation — which left an admin editing /rw unable to tell
   * what still needed translating. Omit for values that are not per-locale (a URL, an
   * email, the Arabic Shahada), where `value` is already the raw text.
   */
  editValue?: string;
  onCommit: (next: string) => void;
  /** Element to render (defaults to span so it drops into any layout). */
  as?: Tag;
  className?: string;
  dir?: 'ltr' | 'rtl';
  style?: React.CSSProperties;
  /** Distinguishes the seed when the same field is shown per-language. */
  lang?: string;
  placeholder?: string;
  /** Permission this field requires to be editable. Defaults to content:edit. */
  permission?: Permission;
}

function EditableNode({ value, editValue, onCommit, as = 'span', className = '', dir = 'ltr', style, placeholder }: InlineTextProps) {
  const ref = useRef<HTMLElement>(null);

  // What this box edits: the active locale's own text when the caller distinguishes
  // it, else the resolved text. Editing the resolved text directly is what made an
  // untranslated field on /rw indistinguishable from a translated one.
  const seed = editValue ?? value;

  // The text the box currently holds according to the store, tracked across renders
  // so `commit` can tell a real edit from a no-op. `onBlur` fires unconditionally, so
  // without this, merely clicking into a field and out again committed its text and
  // marked the section dirty — writing the English fallback into the Kinyarwanda slot
  // and, on publish, freezing English in as the translation. That destroys the "empty
  // means untranslated" signal the whole fallback depends on.
  const committed = useRef(seed);
  useEffect(() => {
    committed.current = seed;
  }, [seed]);

  useEffect(() => {
    // Seed the DOM text once per mount only — re-seeding on every change would fight
    // the caret while typing (see file header).
    if (ref.current) ref.current.innerText = seed ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Tag = as as React.ElementType;
  const commit = (e: React.SyntheticEvent<HTMLElement>) => {
    const next = e.currentTarget.innerText;
    // Nothing to persist: the store already holds exactly this text. Skipping cannot
    // change what the page shows, and it keeps focus/blur from manufacturing an edit
    // nobody made.
    if (next === committed.current) return;
    onCommit(next);
  };

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      dir={dir}
      style={style}
      data-ph={placeholder}
      onInput={commit}
      onBlur={commit}
      // Stop editable clicks from triggering surrounding links/buttons.
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      className={`ie-editable ${className}`}
    />
  );
}

export function InlineText(props: InlineTextProps) {
  const { editing, seedVersion } = useEditingState(props.permission);
  const { value, as = 'span', className = '', dir = 'ltr', style } = props;

  if (!editing) {
    const Tag = as as React.ElementType;
    return (
      <Tag className={className} dir={dir} style={style}>
        {value}
      </Tag>
    );
  }

  // Remount (re-seed) when language or publish/discard version changes.
  return <EditableNode key={`${props.lang ?? ''}:${seedVersion}`} {...props} />;
}

/** Small hook so the render path above reads clean. */
function useEditingState(permission: Permission = Permission.CONTENT_EDIT) {
  const { editMode, hasPermission, seedVersion } = useEditMode();
  return { editing: editMode && hasPermission(permission), seedVersion };
}
