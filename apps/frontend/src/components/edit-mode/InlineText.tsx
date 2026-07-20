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
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';

type Tag = 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';

interface InlineTextProps {
  value: string;
  onCommit: (next: string) => void;
  /** Element to render (defaults to span so it drops into any layout). */
  as?: Tag;
  className?: string;
  dir?: 'ltr' | 'rtl';
  style?: React.CSSProperties;
  /** Distinguishes the seed when the same field is shown per-language. */
  lang?: string;
  placeholder?: string;
}

function EditableNode({ value, onCommit, as = 'span', className = '', dir = 'ltr', style, placeholder }: InlineTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Seed the DOM text once per mount only — re-seeding on every `value` change
    // would fight the caret while typing (see file header).
    if (ref.current) ref.current.innerText = value ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Tag = as as React.ElementType;
  const commit = (e: React.SyntheticEvent<HTMLElement>) => onCommit(e.currentTarget.innerText);

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
  const { editing, seedVersion } = useEditingState();
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
function useEditingState() {
  const { editMode, canEdit, seedVersion } = useEditMode();
  return { editing: editMode && canEdit, seedVersion };
}
