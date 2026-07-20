'use client';

/**
 * In-context affordance for sections that are NOT yet inline-editable — the
 * collection/list sections (activities, announcements, partners, …) whose items
 * carry images and add/remove semantics that "type in place" can't express.
 *
 * In Edit Mode it wraps its section in a relatively-positioned shell and floats a
 * labelled pencil that deep-links to that section's existing admin editor. On the
 * public site (or for non-admins) it renders its children untouched — just a
 * passthrough with no wrapper cost beyond a plain <div>.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { SquarePen } from 'lucide-react';

export function AdminEditLink({
  label,
  /** Admin content folder, e.g. "activities-events". */
  adminSlug,
  children,
}: {
  label: string;
  adminSlug: string;
  children: React.ReactNode;
}) {
  const { editMode, canEdit } = useEditMode();
  const { locale } = useParams<{ locale: string }>();

  if (!editMode || !canEdit) return <>{children}</>;

  return (
    <div className="relative outline-dashed outline-2 outline-rmc-gold/30 outline-offset-[-6px] rounded-2xl">
      <Link
        href={`/${locale}/admin/content/${adminSlug}`}
        className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-gray-900/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-rmc-green transition-colors"
      >
        <SquarePen className="w-3.5 h-3.5 text-rmc-gold" />
        Edit {label}
      </Link>
      {children}
    </div>
  );
}
