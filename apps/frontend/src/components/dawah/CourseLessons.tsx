'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BookOpen, ListTree } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { CourseLessonBrowser, type OutlineLesson } from '@/components/dawah/CourseLessonBrowser';
import { LessonsManager } from '@/components/dawah/LessonsManager';

/**
 * The course's lessons region on its public page. For a normal visitor it is
 * exactly the read-only `CourseLessonBrowser` (the reading player). For a
 * `dawah:manage` admin it grows a "Manage lessons" toggle that swaps the reader
 * for the in-place `LessonsManager` — the same builder as the admin dashboard —
 * so lessons can be added/edited/reordered without leaving the page.
 *
 * The reader renders from the SERVER-resolved lessons (sanitised, locale-picked);
 * the manager fetches its own raw admin copy. When the admin has changed anything
 * and returns to reading, we `router.refresh()` so the reader reflects the edits.
 */
export function CourseLessons({
  lessons,
  overviewHtml,
  courseSlug,
  courseId,
}: {
  lessons: OutlineLesson[];
  /** Sanitised course description; empty when there is none. */
  overviewHtml: string;
  courseSlug: string;
  courseId: string;
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.DAWAH_MANAGE);
  const t = useTranslations('admin.dawah');
  const router = useRouter();

  const [managing, setManaging] = useState(false);
  const changed = useRef(false);

  const hasContent = lessons.length > 0 || overviewHtml.trim() !== '';

  const reader = hasContent ? (
    <CourseLessonBrowser lessons={lessons} overviewHtml={overviewHtml} courseSlug={courseSlug} />
  ) : null;

  // Non-admins get the plain reader (or nothing) — byte-for-byte the old page.
  if (!canManage) return reader;

  const stopManaging = () => {
    setManaging(false);
    if (changed.current) {
      changed.current = false;
      // Pull the freshly-edited lessons back into the server-rendered reader.
      router.refresh();
    }
  };

  return (
    <ToastProvider>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => (managing ? stopManaging() : setManaging(true))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
        >
          {managing ? (
            <>
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {t('lessons.donePreview')}
            </>
          ) : (
            <>
              <ListTree className="h-3.5 w-3.5" aria-hidden />
              {t('courses.manageLessons')}
            </>
          )}
        </button>
      </div>

      {managing ? (
        <LessonsManager
          courseId={courseId}
          canManage
          onChanged={() => { changed.current = true; }}
        />
      ) : (
        reader ?? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            {t('lessons.empty')}
          </div>
        )
      )}
    </ToastProvider>
  );
}
