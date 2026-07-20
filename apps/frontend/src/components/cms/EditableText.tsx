'use client';

import { useEffect, useRef, type ElementType } from 'react';
import { useParams } from 'next/navigation';
import { useEditMode } from '@/contexts/EditModeContext';
import { isRtl } from '@/lib/content-api';
import { cn } from '@/lib/utils';

/**
 * A single piece of admin-editable copy, edited in place.
 *
 * Outside edit mode (or for a user without `canSave`) it renders as plain text —
 * byte-for-byte what the page showed before it became editable. Inside edit mode
 * it turns into a `contentEditable` node that inherits the surrounding
 * typography, so a heading still looks like a heading while you type into it.
 *
 * The edited value is the ACTIVE LOCALE's slot of the field's `Tri`. Editing on
 * /ar writes Arabic; the other languages are untouched. That is the whole point
 * of editing "on the page" — you see and change exactly the words a visitor in
 * this language sees.
 */
export function EditableText({
  path,
  as,
  className,
  multiline = false,
  placeholder,
}: {
  /** Dotted path to the `Tri` inside the section content, e.g. 'header.title'. */
  path: string;
  /** Element to render as. Defaults to a block-friendly <span>. */
  as?: ElementType;
  className?: string;
  /** Allow Enter to insert a newline (headings stay single-line). */
  multiline?: boolean;
  placeholder?: string;
}) {
  const Tag = (as ?? 'span') as ElementType;
  const { editing, canSave, getText, setText } = useEditMode();
  const { locale } = useParams<{ locale: string }>();
  const ref = useRef<HTMLElement>(null);

  const text = getText(path, locale);
  const active = editing && canSave;

  // Sync the DOM to external changes (initial load, discard, locale switch)
  // WITHOUT clobbering the caret while this very node is being typed into.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== text) el.textContent = text;
  }, [text, active]);

  if (!active) {
    return <Tag className={className}>{text || placeholder}</Tag>;
  }

  return (
    <Tag
      ref={ref}
      role="textbox"
      aria-label={placeholder ?? path}
      contentEditable
      suppressContentEditableWarning
      dir={isRtl(locale) ? 'rtl' : undefined}
      data-placeholder={placeholder}
      onInput={(e: React.FormEvent<HTMLElement>) =>
        setText(path, locale, e.currentTarget.innerText)
      }
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!multiline && e.key === 'Enter') e.preventDefault();
      }}
      className={cn(
        // Read as an editable field: inherit the type, add an unobtrusive dashed
        // outline that firms up on hover/focus. Negative margin keeps the text
        // aligned with the surrounding layout despite the padding.
        '-mx-1 cursor-text rounded-md px-1 outline-dashed outline-1 outline-offset-2 outline-rmc-green/40 transition-[outline]',
        'hover:outline-rmc-green/70 focus:outline-2 focus:outline-rmc-green',
        'empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]',
        className,
      )}
    />
  );
}
