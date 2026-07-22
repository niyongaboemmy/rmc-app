'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil } from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { CourseModal } from './CourseModal';
import { dawahApi, type DawahCategory, type DawahCourse } from '@/lib/dawahApi';

/**
 * The in-place editor for a single course's own page — the detail-route twin of
 * the catalogue's inline CMS. Shown ONLY to a `dawah:manage` holder; every other
 * visitor (and every anonymous crawler) gets nothing, so the public page is
 * byte-for-byte what it always was.
 *
 * "Edit course" opens the same `CourseModal` the admin dashboard and the
 * catalogue use, seeded from the record the server already resolved (the detail
 * route returns the full course — no extra fetch) for the STRUCTURAL fields that
 * have no inline representation: the rich description, cover, instructor, level,
 * language, format, status, etc. (The visible title & summary edit inline — see
 * `CourseInlineText`.)
 *
 * Rendered as a small button in the header card's corner (the page makes the card
 * `relative`), NOT a floating toolbar — the site-wide EditModeBar is the toolbar.
 */
export function CourseEditBar({ course }: { course: DawahCourse }) {
  const { editMode, hasPermission } = useEditMode();
  const show = editMode && hasPermission(Permission.DAWAH_MANAGE);
  const t = useTranslations('admin.dawah');
  const router = useRouter();

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  // Categories power the modal's category select. Fetched lazily on first edit —
  // an anonymous page load must not pay for a list it will never show.
  useEffect(() => {
    if (!modalOpen || categories.length) return;
    setLoadingCats(true);
    dawahApi
      .categories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false));
  }, [modalOpen, categories.length]);

  // Only in the site-wide Edit Mode, and only for a dawah:manage holder.
  if (!show) return null;

  return (
    <>
      <div className="absolute end-3 top-3 z-10 print:hidden">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={loadingCats}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-60"
        >
          {loadingCats ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          )}
          {t('courses.edit')}
        </button>
      </div>

      {modalOpen && !loadingCats && (
        <CourseModal
          course={course}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            // Pull the freshly-saved record (title, cover, meta) back into the
            // server-rendered page. A slug change on a published course is ignored
            // by the API, so the current URL stays valid.
            router.refresh();
          }}
        />
      )}
    </>
  );
}
