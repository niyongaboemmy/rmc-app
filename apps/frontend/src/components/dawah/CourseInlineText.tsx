'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Permission } from '@/lib/permissions';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { dawahApi, type CoursePayload } from '@/lib/dawahApi';

/**
 * A single course RECORD field (title or summary) rendered click-to-edit in place
 * on the course detail page — the "live" twin of the InlineText copy editing on
 * the catalogue/library/etc.
 *
 * The detail page's text is not a `site_content` section (which the global edit
 * store batch-publishes); it is the course row itself. So this does NOT go through
 * the store: editing writes the active locale's field (title/summary × en/rw/ar)
 * straight to the course via `dawahApi.admin.courses.update`, DEBOUNCED so a burst
 * of keystrokes is one request. Gated on `dawah:manage` (record management), the
 * same permission the "Edit course" form modal uses.
 *
 * On save it `router.refresh()`es so the rest of the server-rendered page (and the
 * form modal, seeded from the server course prop) sees the new value; the caret is
 * unaffected because InlineText only seeds its DOM on mount, not on value changes.
 *
 * Outside edit mode it renders exactly the tag it was given — byte-for-byte the
 * public page. An empty value renders nothing when read-only (same as before).
 */
const localeSuffix = (locale: string): 'En' | 'Rw' | 'Ar' =>
  locale === 'rw' ? 'Rw' : locale === 'ar' ? 'Ar' : 'En';

export function CourseInlineText({
  courseId,
  field,
  value,
  locale,
  as,
  className,
  readClassName,
  placeholder,
}: {
  courseId: string;
  field: 'title' | 'summary';
  value: string;
  locale: string;
  as: 'h1' | 'p' | 'span';
  className?: string;
  /** Extra classes applied ONLY in read-only mode (e.g. `line-clamp-2`). */
  readClassName?: string;
  placeholder?: string;
}) {
  const { editMode, hasPermission } = useEditMode();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);

  const editable = editMode && hasPermission(Permission.DAWAH_MANAGE);

  const onCommit = useCallback(
    (v: string) => {
      latest.current = v;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const next = latest.current.trim();
        if (next === (value ?? '').trim()) return;
        const key = `${field}${localeSuffix(locale)}`;
        try {
          await dawahApi.admin.courses.update(courseId, { [key]: next } as Partial<CoursePayload>);
          router.refresh();
        } catch {
          /* keep the edit visible in the DOM; a failed save must not wipe it */
        }
      }, 700);
    },
    [courseId, field, locale, value, router],
  );

  if (!editable) {
    if (!value) return null;
    const Tag = as;
    return <Tag className={[className, readClassName].filter(Boolean).join(' ')}>{value}</Tag>;
  }

  return (
    <InlineText
      as={as}
      lang={locale}
      value={value}
      onCommit={onCommit}
      placeholder={placeholder}
      className={className}
      permission={Permission.DAWAH_MANAGE}
    />
  );
}
