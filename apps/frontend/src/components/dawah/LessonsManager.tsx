'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ListTree, Plus, Pencil, Trash2, RefreshCw, GripVertical, BookOpen,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { localized } from '@/components/dawah/localize';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { LessonModal } from '@/components/dawah/LessonModal';
import {
  dawahApi, type DawahCourse, type DawahCourseLesson,
} from '@/lib/dawahApi';

/**
 * The lesson builder for one course: an ordered list with drag-to-reorder and
 * add / edit / delete, wrapped around the shared `LessonModal`.
 *
 * Self-contained — it fetches the course's ADMIN projection itself (the public
 * course payload carries only display-resolved lessons, not the raw tri-lingual
 * records the editor needs). Both callers use it verbatim: the admin builder
 * page at /admin/dawah/courses/[id]/lessons, and the in-place manager on a
 * course's own public page (`CourseLessons`). It must be rendered inside a
 * `ToastProvider`.
 *
 * `onChanged` fires after any successful mutation, so a host that renders a
 * separate read-only view of the same lessons (the public page's reader) can
 * refresh it when the admin is done.
 */
export function LessonsManager({ courseId, canManage, onChanged }: {
  courseId: string;
  canManage: boolean;
  onChanged?: () => void;
}) {
  const t = useTranslations('admin.dawah');
  const { locale } = useParams<{ locale: string }>();
  const { success, error } = useToast();

  const [course, setCourse] = useState<DawahCourse | null>(null);
  const [lessons, setLessons] = useState<DawahCourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; lesson: DawahCourseLesson | null }>({ open: false, lesson: null });
  const [deleting, setDeleting] = useState<DawahCourseLesson | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Latest order, readable from the drop handler without a stale closure.
  const lessonsRef = useRef<DawahCourseLesson[]>([]);
  useEffect(() => { lessonsRef.current = lessons; }, [lessons]);

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    try {
      const c = await dawahApi.admin.courses.get(courseId);
      setCourse(c);
      setLessons([...(c.lessons ?? [])].sort((a, b) => a.sortOrder - b.sortOrder));
      setNotFound(false);
    } catch {
      setNotFound(true);
      error(t('lessons.loadError'));
    } finally {
      setLoading(false);
    }
  }, [courseId, t, error]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  // ── Drag-to-reorder (native HTML5, optimistic with rollback) ────────────────
  const dragFrom = useRef<number | null>(null);
  const orderBeforeDrag = useRef<DawahCourseLesson[] | null>(null);

  const onDragStart = (index: number) => {
    dragFrom.current = index;
    orderBeforeDrag.current = lessonsRef.current;
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragFrom.current;
    if (from === null || from === index) return;
    setLessons((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragFrom.current = index;
  };

  const onDragEnd = async () => {
    const before = orderBeforeDrag.current;
    dragFrom.current = null;
    orderBeforeDrag.current = null;
    if (!before) return;

    const ids = lessonsRef.current.map((l) => l.id);
    // No net change — nothing to persist.
    if (ids.join(',') === before.map((l) => l.id).join(',')) return;

    try {
      const updated = await dawahApi.admin.lessons.reorder(courseId, ids);
      setLessons([...updated].sort((a, b) => a.sortOrder - b.sortOrder));
      success(t('lessons.reordered'));
      onChanged?.();
    } catch {
      setLessons(before); // rollback: a silently-wrong order is worse than a snap-back
      error(t('lessons.reorderError'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await dawahApi.admin.lessons.remove(deleting.id);
      success(t('lessons.deleted'));
      setDeleting(null);
      onChanged?.();
      fetchCourse();
    } catch {
      error(t('lessons.deleteError'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10">
            <ListTree className="h-5 w-5 text-rmc-green" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight text-gray-900">
              {course ? localized(course, 'title', locale) || course.slug : t('lessons.title')}
            </h2>
            <p className="text-sm text-gray-500">{t('lessons.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCourse}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            <RefreshCw className="h-4 w-4" /> {t('lessons.refresh')}
          </button>
          {canManage && (
            <button
              onClick={() => setModal({ open: true, lesson: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
            >
              <Plus className="h-4 w-4" /> {t('lessons.add')}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('readOnly')}
        </p>
      )}

      {canManage && lessons.length > 1 && (
        <p className="text-xs text-gray-400">{t('lessons.reorderHint')}</p>
      )}

      {/* Lesson list */}
      <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-rmc-green" />
          </div>
        ) : notFound ? (
          <div className="py-14 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">{t('lessons.courseNotFound')}</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="py-14 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">{t('lessons.empty')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lessons.map((lesson, i) => (
              <li
                key={lesson.id}
                draggable={canManage}
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDragEnd={onDragEnd}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 ring-1 ring-black/[0.02] transition-colors',
                  canManage && 'cursor-move hover:border-rmc-green/30',
                )}
              >
                {canManage && (
                  <GripVertical className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
                )}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rmc-green/20 bg-rmc-green/10 text-xs font-semibold text-rmc-green">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {localized(lesson, 'title', locale) || `#${i + 1}`}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      {t(`lessons.contentTypes.${lesson.contentType}`)}
                    </span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setModal({ open: true, lesson })}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green"
                      aria-label={t('actions.edit')}
                      title={t('actions.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(lesson)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={t('actions.delete')}
                      title={t('actions.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal.open && canManage && (
        <LessonModal
          courseId={courseId}
          lesson={modal.lesson}
          onClose={() => setModal({ open: false, lesson: null })}
          onSaved={() => { setModal({ open: false, lesson: null }); onChanged?.(); fetchCourse(); }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => (deleteBusy ? undefined : setDeleting(null))}
        onConfirm={confirmDelete}
        title={t('actions.delete')}
        message={t('lessons.confirmDelete')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        isLoading={deleteBusy}
      />
    </div>
  );
}
