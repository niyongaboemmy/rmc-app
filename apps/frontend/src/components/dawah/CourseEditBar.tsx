'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { CourseModal } from './CourseModal';
import { dawahApi, type DawahCategory, type DawahCourse } from '@/lib/dawahApi';

/**
 * The in-place editor for a single course's own page — the detail-route twin of
 * the catalogue's inline CMS. Shown ONLY to a `dawah:manage` holder; every other
 * visitor (and every anonymous crawler) gets nothing, so the public page is
 * byte-for-byte what it always was.
 *
 * It carries two affordances: "Edit course" opens the same `CourseModal` the
 * admin dashboard and the catalogue use, seeded from the record the server
 * already resolved (the detail route returns the full course, description and
 * all — no extra fetch); and "Manage lessons" links straight into the admin
 * lessons editor, since lessons are structured records, not page copy, and have
 * no sensible in-place representation here.
 *
 * A fixed island, positioned to sit under the floating toolbar's slot so it
 * reads as the same family of control as the Library/Courses catalogue toolbar.
 */
export function CourseEditBar({ course }: { course: DawahCourse }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.DAWAH_MANAGE);
  const t = useTranslations('admin.dawah');
  const router = useRouter();

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [editing, setEditing] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  // Categories power the modal's category select. Fetched lazily on first edit —
  // an anonymous page load must not pay for a list it will never show.
  useEffect(() => {
    if (!editing || categories.length) return;
    setLoadingCats(true);
    dawahApi
      .categories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false));
  }, [editing, categories.length]);

  if (!canManage) return null;

  return (
    <ToastProvider>
      <div className="fixed top-16 z-[60] flex ltr:right-4 rtl:left-4 print:hidden">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={loadingCats}
          className="inline-flex items-center gap-2 rounded-lg border border-rmc-green bg-white px-3 py-1.5 text-sm font-semibold text-rmc-green shadow-lg shadow-rmc-green/10 transition-colors hover:bg-rmc-green-light disabled:opacity-60"
        >
          {loadingCats ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Pencil className="h-4 w-4" aria-hidden />
          )}
          {t('courses.edit')}
        </button>
      </div>

      {editing && !loadingCats && (
        <CourseModal
          course={course}
          categories={categories}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            // Pull the freshly-saved record (title, cover, meta) back into the
            // server-rendered page. A slug change on a published course is ignored
            // by the API, so the current URL stays valid.
            router.refresh();
          }}
        />
      )}
    </ToastProvider>
  );
}
