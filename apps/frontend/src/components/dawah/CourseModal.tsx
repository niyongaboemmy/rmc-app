'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { fileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { localized } from '@/components/dawah/localize';
import {
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
} from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  dawahApi,
  type DawahCourse, type DawahCategory, type CoursePayload,
  type CourseLevel, type CourseLanguage, type CourseFormat, type ContentStatus,
} from '@/lib/dawahApi';

/**
 * The create / edit course form, shared by two callers:
 *   - the admin table at /admin/dawah/courses, and
 *   - the in-place ("visual") CMS on the public /dawah/courses catalogue and on a
 *     course's own /dawah/courses/[slug] page.
 *
 * It was lifted verbatim out of the admin page so both surfaces stay in lockstep;
 * the helpers and option lists it needs (`LEVELS`, `STATUSES`, `htmlEmpty`, the
 * `Lang` type, …) are exported here too, since the admin table still uses them
 * for its filters and translation chips.
 */

// ── Shared field classes — the unified form spec (matches admin/dawah/categories) ──
const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';

export const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
export const FORMATS: CourseFormat[] = ['self_paced', 'in_person', 'hybrid'];
export const COURSE_LANGS: CourseLanguage[] = ['en', 'rw', 'ar', 'multi'];
export const STATUSES: ContentStatus[] = ['draft', 'published', 'archived'];

// Tri-lingual editing tabs. `dir: 'rtl'` for Arabic — copied from
// admin/content/blog. English is the required baseline; rw/ar may be blank.
export type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr' },
  { key: 'ar', label: 'Arabic', dir: 'rtl' },
];
const emptyLangRecord = (): Record<Lang, string> => ({ en: '', rw: '', ar: '' });

// ImageUploadField deals in resolved file URLs; the API stores raw file-server
// keys. Convert at the seam so the payload carries a key and the widget a URL.
const FILE_URL_PREFIX = fileUrl('');
const keyToUrl = (key: string | null | undefined) => (key ? fileUrl(key) : '');
const urlToKey = (url: string): string | null =>
  url ? url.replace(FILE_URL_PREFIX, '') : null;

// TipTap serialises "empty" as an empty paragraph — treat that as blank so a
// never-touched description doesn't read as a completed translation.
export const htmlEmpty = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim().length === 0;

/** A language column counts as complete only when title, summary AND description are filled. */
function langComplete(
  lang: Lang,
  title: Record<Lang, string>,
  summary: Record<Lang, string>,
  description: Record<Lang, string>,
) {
  return (
    title[lang].trim() !== '' &&
    summary[lang].trim() !== '' &&
    !htmlEmpty(description[lang])
  );
}

// ── Create / edit course modal ───────────────────────────────────────────────

export function CourseModal({ course, categories, onClose, onSaved }: {
  course: DawahCourse | null;
  categories: DawahCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('admin.dawah');
  const td = useTranslations('dawah.courses');
  const isEdit = !!course;

  const [title, setTitle] = useState<Record<Lang, string>>(
    course ? { en: course.titleEn, rw: course.titleRw, ar: course.titleAr } : emptyLangRecord(),
  );
  const [summary, setSummary] = useState<Record<Lang, string>>(
    course ? { en: course.summaryEn, rw: course.summaryRw, ar: course.summaryAr } : emptyLangRecord(),
  );
  const [description, setDescription] = useState<Record<Lang, string>>(
    course ? { en: course.descriptionEn, rw: course.descriptionRw, ar: course.descriptionAr } : emptyLangRecord(),
  );
  const [modalLang, setModalLang] = useState<Lang>('en');

  const [categoryId, setCategoryId] = useState(course?.categoryId ?? '');
  const [level, setLevel] = useState<CourseLevel>(course?.level ?? 'beginner');
  const [language, setLanguage] = useState<CourseLanguage>(course?.language ?? 'en');
  const [format, setFormat] = useState<CourseFormat>(course?.format ?? 'self_paced');
  const [coverUrl, setCoverUrl] = useState(keyToUrl(course?.coverImageKey));
  const [instructorName, setInstructorName] = useState(course?.instructorName ?? '');
  const [instructorTitle, setInstructorTitle] = useState(course?.instructorTitle ?? '');
  const [instructorPhotoUrl, setInstructorPhotoUrl] = useState(keyToUrl(course?.instructorPhotoKey));
  const [durationMinutes, setDurationMinutes] = useState(course?.durationMinutes != null ? String(course.durationMinutes) : '');
  const [isFeatured, setIsFeatured] = useState(course?.isFeatured ?? false);
  const [status, setStatus] = useState<ContentStatus>(course?.status ?? 'draft');
  const [sortOrder, setSortOrder] = useState(course?.sortOrder != null ? String(course.sortOrder) : '');
  const [slug, setSlug] = useState(course?.slug ?? '');

  const [saving, setSaving] = useState(false);
  const [titleErr, setTitleErr] = useState('');

  const { success, error } = useToast();
  // A published course's slug is a live public URL — the API ignores changes to it.
  const slugLocked = isEdit && course?.status === 'published';

  const setLang = (setter: React.Dispatch<React.SetStateAction<Record<Lang, string>>>) =>
    (val: string) => setter((prev) => ({ ...prev, [modalLang]: val }));

  const save = async () => {
    if (!title.en.trim()) {
      setModalLang('en');
      setTitleErr(t('courses.titleRequired'));
      return;
    }
    setSaving(true);
    const payload: CoursePayload = {
      slug: slugLocked ? undefined : slug.trim() || undefined,
      categoryId: categoryId || null,
      titleEn: title.en.trim(),
      titleRw: title.rw.trim(),
      titleAr: title.ar.trim(),
      summaryEn: summary.en.trim(),
      summaryRw: summary.rw.trim(),
      summaryAr: summary.ar.trim(),
      descriptionEn: htmlEmpty(description.en) ? '' : description.en,
      descriptionRw: htmlEmpty(description.rw) ? '' : description.rw,
      descriptionAr: htmlEmpty(description.ar) ? '' : description.ar,
      level,
      language,
      format,
      coverImageKey: urlToKey(coverUrl),
      instructorName: instructorName.trim() || null,
      instructorTitle: instructorTitle.trim() || null,
      instructorPhotoKey: urlToKey(instructorPhotoUrl),
      durationMinutes: durationMinutes.trim() ? Number(durationMinutes) : null,
      isFeatured,
      status,
      sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
    };
    try {
      if (isEdit && course) await dawahApi.admin.courses.update(course.id, payload);
      else await dawahApi.admin.courses.create(payload);
      success(isEdit ? t('courses.updated') : t('courses.created'));
      onSaved();
    } catch {
      error(t('courses.saveError'));
      setSaving(false);
    }
  };

  const activeDir = LANGS.find((l) => l.key === modalLang)!.dir;

  return (
    <Modal open onClose={onClose} size="2xl">
      <ModalHeader>
        <ModalTitle>{isEdit ? t('courses.edit') : t('courses.new')}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          {/* Content — tri-lingual */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700">{t('courses.sections.content')}</h3>
              <LangTabs
                active={modalLang}
                onChange={setModalLang}
                complete={(l) => langComplete(l, title, summary, description)}
              />
            </div>

            <div>
              <label className={labelClass}>
                {t('courses.fields.title')} <span className="text-red-500">*</span>
              </label>
              <input
                dir={activeDir}
                value={title[modalLang]}
                onChange={(e) => { setLang(setTitle)(e.target.value); setTitleErr(''); }}
                className={inputClass}
              />
              {titleErr && <p className="mt-1 text-[11px] text-red-600">{titleErr}</p>}
            </div>

            <div>
              <label className={labelClass}>{t('courses.fields.summary')}</label>
              <textarea
                dir={activeDir}
                rows={2}
                value={summary[modalLang]}
                onChange={(e) => setLang(setSummary)(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t('courses.fields.description')}</label>
              {/* Keyed by language: the editor is UNCONTROLLED after mount, so it
                  MUST remount when the tab changes or typing in AR would overwrite
                  the EN column. See RichTextEditor's own header comment. */}
              <RichTextEditor
                key={modalLang}
                value={description[modalLang]}
                onChange={setLang(setDescription)}
                dir={activeDir}
              />
            </div>
          </section>

          {/* Classification */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">{t('courses.sections.meta')}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{t('courses.fields.category')}</label>
                <SearchableSelect
                  value={categoryId}
                  onChange={setCategoryId}
                  options={[
                    { value: '', label: t('courses.noCategory') },
                    ...categories.map((c) => ({ value: c.id, label: localized(c, 'name', 'en') })),
                  ]}
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('courses.fields.level')}</label>
                <SearchableSelect
                  value={level}
                  onChange={(v) => setLevel(v as CourseLevel)}
                  options={LEVELS.map((l) => ({ value: l, label: td(`level.${l}`) }))}
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('courses.fields.language')}</label>
                <SearchableSelect
                  value={language}
                  onChange={(v) => setLanguage(v as CourseLanguage)}
                  options={COURSE_LANGS.map((l) => ({ value: l, label: td(`language.${l}`) }))}
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('courses.fields.format')}</label>
                <SearchableSelect
                  value={format}
                  onChange={(v) => setFormat(v as CourseFormat)}
                  options={FORMATS.map((f) => ({ value: f, label: td(`format.${f}`) }))}
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('courses.fields.duration')}</label>
                <input
                  type="number" min={0}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Cover */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">{t('courses.sections.cover')}</h3>
            <ImageUploadField value={coverUrl} onChange={setCoverUrl} heightClass="h-40" />
          </section>

          {/* Instructor */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">{t('courses.sections.instructor')}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{t('courses.fields.instructorName')}</label>
                <input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('courses.fields.instructorTitle')}</label>
                <input value={instructorTitle} onChange={(e) => setInstructorTitle(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="w-32">
              <label className={labelClass}>{t('courses.fields.instructorPhoto')}</label>
              <ImageUploadField
                value={instructorPhotoUrl}
                onChange={setInstructorPhotoUrl}
                heightClass="h-32"
                rounded="rounded-full"
                compact
              />
            </div>
          </section>

          {/* Publishing */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">{t('courses.sections.publishing')}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{t('courses.fields.slug')}</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={slugLocked}
                  placeholder="auto"
                  className={cn(inputClass, slugLocked && 'cursor-not-allowed bg-gray-50 text-gray-400')}
                />
                {slugLocked && <p className="mt-1 text-[11px] text-gray-400">{t('courses.slugLocked')}</p>}
              </div>
              <div>
                <label className={labelClass}>{t('status.draft')} / {t('status.published')}</label>
                <SearchableSelect
                  value={status}
                  onChange={(v) => setStatus(v as ContentStatus)}
                  options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('courses.fields.sortOrder')}</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2.5">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-rmc-green"
                />
                <span className="text-sm text-gray-700">{t('courses.fields.featured')}</span>
              </label>
            </div>
          </section>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {t('actions.cancel')}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-rmc-green px-5 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50"
        >
          {saving ? t('courses.saving') : isEdit ? t('actions.save') : t('actions.create')}
        </button>
      </ModalFooter>
    </Modal>
  );
}

/** EN / RW / AR tab strip with a per-language completeness dot. */
function LangTabs({ active, onChange, complete }: {
  active: Lang; onChange: (l: Lang) => void; complete: (l: Lang) => boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      {LANGS.map((l) => {
        const isActive = l.key === active;
        const ok = complete(l.key);
        return (
          <button
            key={l.key}
            type="button"
            onClick={() => onChange(l.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-green-500' : 'bg-amber-400')}
              aria-hidden
            />
            {l.key.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
