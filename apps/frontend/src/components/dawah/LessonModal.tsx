'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  UploadCloud, FileAudio, FileText, X, CheckCircle2, AlertCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
} from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { LessonVideo } from '@/components/dawah/LessonVideo';
import { parseMediaEmbed, isHttpsUrl } from '@/lib/dawah/media';
import {
  dawahApi, uploadLessonMedia,
  type DawahCourseLesson, type LessonPayload, type UploadedBookFile,
} from '@/lib/dawahApi';

/**
 * The add / edit lesson form, shared by two callers: the admin lessons builder
 * at /admin/dawah/courses/[id]/lessons and the in-place lesson manager on a
 * course's own public page. It was lifted verbatim out of the admin page so both
 * surfaces stay in lockstep — see `LessonsManager` for the list around it.
 */

const MEDIA_MAX_BYTES = 90 * 1024 * 1024; // mirrors backend MEDIA_MAX_BYTES

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-rmc-green/40 focus:ring-2 focus:ring-rmc-green/30';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-500';

type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr' },
  { key: 'ar', label: 'Arabic', dir: 'rtl' },
];
const emptyLangRecord = (): Record<Lang, string> => ({ en: '', rw: '', ar: '' });

const htmlEmpty = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim().length === 0;

// The lesson entity carries content_type + media columns. All five types are
// reachable: 'text' (rich body), 'video'/'link' (external URL), 'audio'/'pdf'
// (uploaded file). The backend nulls whichever media field the chosen type
// doesn't use.
const CONTENT_TYPES: DawahCourseLesson['contentType'][] = ['text', 'video', 'audio', 'pdf', 'link'];

// ── Audio/PDF upload field (progress) — clones the library PdfUploadField ──────

function MediaUploadField({ kind, value, onChange }: {
  kind: 'audio' | 'pdf';
  value: UploadedBookFile | null;
  onChange: (file: UploadedBookFile | null) => void;
}) {
  const t = useTranslations('admin.dawah');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');

  const accept = kind === 'audio' ? 'audio/*' : 'application/pdf';
  const FileIcon = kind === 'audio' ? FileAudio : FileText;
  const typeOk = (f: File) => kind === 'audio' ? f.type.startsWith('audio/') : f.type === 'application/pdf';

  const pick = async (file?: File | null) => {
    if (!file) return;
    if (!typeOk(file)) { setErr(t(kind === 'audio' ? 'lessons.audioTypeError' : 'lessons.pdfTypeError')); return; }
    if (file.size > MEDIA_MAX_BYTES) { setErr(t('lessons.uploadFailed')); return; }
    setUploading(true); setErr(''); setPct(0);
    try {
      onChange(await uploadLessonMedia(file, setPct));
    } catch {
      setErr(t('lessons.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <label className={labelClass}>{t(kind === 'audio' ? 'lessons.fields.audioFile' : 'lessons.fields.pdfFile')}</label>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {uploading ? (
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-sm text-gray-600">
            <UploadCloud className="h-4 w-4 text-rmc-green" /> {t('lessons.uploadingPct', { pct })}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-rmc-green transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rmc-green/10 text-rmc-green"><FileIcon className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{value.fileName}</p>
            {value.fileSize > 0 && <p className="text-[11px] text-gray-400">{(value.fileSize / (1024 * 1024)).toFixed(1)} MB</p>}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-white">{t('lessons.replaceMedia')}</button>
          <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={t('actions.delete')}><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-4 text-sm font-semibold text-gray-400 transition-colors hover:border-rmc-green/40 hover:text-rmc-green">
          <UploadCloud className="h-5 w-5" /> {t(kind === 'audio' ? 'lessons.chooseAudio' : 'lessons.choosePdf')}
        </button>
      )}
      <p className="mt-1 text-[11px] text-gray-400">{t(kind === 'audio' ? 'lessons.audioHint' : 'lessons.pdfHint')}</p>
      {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}

// ── Add / edit lesson modal ──────────────────────────────────────────────────

export function LessonModal({ courseId, lesson, onClose, onSaved }: {
  courseId: string;
  lesson: DawahCourseLesson | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('admin.dawah');
  const { success, error } = useToast();
  const isEdit = !!lesson;

  const [title, setTitle] = useState<Record<Lang, string>>(
    lesson ? { en: lesson.titleEn, rw: lesson.titleRw, ar: lesson.titleAr } : emptyLangRecord(),
  );
  const [summary, setSummary] = useState<Record<Lang, string>>(
    lesson ? { en: lesson.summaryEn, rw: lesson.summaryRw, ar: lesson.summaryAr } : emptyLangRecord(),
  );
  const [body, setBody] = useState<Record<Lang, string>>(
    lesson ? { en: lesson.bodyEn, rw: lesson.bodyRw, ar: lesson.bodyAr } : emptyLangRecord(),
  );
  const [modalLang, setModalLang] = useState<Lang>('en');
  const [durationMinutes, setDurationMinutes] = useState(lesson?.durationMinutes != null ? String(lesson.durationMinutes) : '');
  const [saving, setSaving] = useState(false);
  const [titleErr, setTitleErr] = useState('');

  // Media: content type + the two hosting paths (external URL for video, an
  // uploaded key for audio). Only one is relevant at a time (BE clears the other).
  const [contentType, setContentType] = useState<'text' | 'video' | 'audio' | 'pdf' | 'link'>(lesson?.contentType ?? 'text');
  const [mediaUrl, setMediaUrl] = useState(lesson?.mediaUrl ?? '');
  const [mediaFile, setMediaFile] = useState<UploadedBookFile | null>(
    lesson?.mediaKey ? { fileKey: lesson.mediaKey, fileName: 'audio', fileSize: 0, mimeType: '' } : null,
  );
  const [mediaErr, setMediaErr] = useState('');
  const videoEmbed = contentType === 'video' ? parseMediaEmbed(mediaUrl) : null;
  const urlInvalid = contentType === 'video' && mediaUrl.trim() !== '' && !videoEmbed;
  const linkInvalid = contentType === 'link' && mediaUrl.trim() !== '' && !isHttpsUrl(mediaUrl);

  const setLang = (setter: React.Dispatch<React.SetStateAction<Record<Lang, string>>>) =>
    (val: string) => setter((prev) => ({ ...prev, [modalLang]: val }));

  const activeDir = LANGS.find((l) => l.key === modalLang)!.dir;

  const save = async () => {
    if (!title.en.trim()) {
      setModalLang('en');
      setTitleErr(t('lessons.titleRequired'));
      return;
    }
    // Media validation mirrors the backend invariant (fast feedback).
    if (contentType === 'video' && !videoEmbed) {
      setMediaErr(t('lessons.videoNeedsUrl'));
      return;
    }
    if (contentType === 'link' && !isHttpsUrl(mediaUrl)) {
      setMediaErr(t('lessons.linkNeedsUrl'));
      return;
    }
    if ((contentType === 'audio' || contentType === 'pdf') && !mediaFile) {
      setMediaErr(t(contentType === 'audio' ? 'lessons.audioNeedsFile' : 'lessons.pdfNeedsFile'));
      return;
    }
    setSaving(true);
    const payload: LessonPayload = {
      titleEn: title.en.trim(),
      titleRw: title.rw.trim(),
      titleAr: title.ar.trim(),
      summaryEn: summary.en.trim(),
      summaryRw: summary.rw.trim(),
      summaryAr: summary.ar.trim(),
      bodyEn: htmlEmpty(body.en) ? '' : body.en,
      bodyRw: htmlEmpty(body.rw) ? '' : body.rw,
      bodyAr: htmlEmpty(body.ar) ? '' : body.ar,
      contentType,
      // Send only the field the chosen type uses; the backend nulls the other.
      mediaUrl: (contentType === 'video' || contentType === 'link') ? mediaUrl.trim() : null,
      mediaKey: (contentType === 'audio' || contentType === 'pdf') ? mediaFile?.fileKey ?? null : null,
      durationMinutes: durationMinutes.trim() ? Number(durationMinutes) : null,
    };
    try {
      if (isEdit && lesson) await dawahApi.admin.lessons.update(lesson.id, payload);
      else await dawahApi.admin.lessons.add(courseId, payload);
      success(isEdit ? t('lessons.updated') : t('lessons.added'));
      onSaved();
    } catch {
      error(t('lessons.saveError'));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="2xl">
      <ModalHeader>
        <ModalTitle>{isEdit ? t('lessons.edit') : t('lessons.new')}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setModalLang(l.key)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    l.key === modalLang ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {l.key.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {t('lessons.fields.title')} <span className="text-red-500">*</span>
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
            <label className={labelClass}>{t('lessons.fields.summary')}</label>
            <textarea
              dir={activeDir}
              rows={2}
              value={summary[modalLang]}
              onChange={(e) => setLang(setSummary)(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('lessons.fields.body')}</label>
            {/* Keyed by language — the editor is uncontrolled after mount, so it
                must remount when the tab changes (see RichTextEditor's comment). */}
            <RichTextEditor
              key={modalLang}
              value={body[modalLang]}
              onChange={setLang(setBody)}
              dir={activeDir}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('lessons.contentType')}</label>
              <select
                value={contentType}
                onChange={(e) => { setContentType(e.target.value as typeof contentType); setMediaErr(''); }}
                className={inputClass}
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{t(`lessons.contentTypes.${ct}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('lessons.fields.duration')}</label>
              <input
                type="number" min={0}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* ── Media (per content type) ─────────────────────────────────── */}
          {contentType === 'video' && (
            <div>
              <label className={labelClass}>{t('lessons.fields.mediaUrl')}</label>
              <input
                type="url"
                dir="ltr"
                value={mediaUrl}
                onChange={(e) => { setMediaUrl(e.target.value); setMediaErr(''); }}
                placeholder="https://www.youtube.com/watch?v=…"
                className={cn(inputClass, urlInvalid && 'border-red-300 focus:border-red-400 focus:ring-red-200')}
              />
              <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                {videoEmbed ? (
                  <><CheckCircle2 className="h-3 w-3 text-green-500" /> {t('lessons.mediaUrlValid', { provider: videoEmbed.provider })}</>
                ) : urlInvalid ? (
                  <><AlertCircle className="h-3 w-3 text-red-500" /> <span className="text-red-500">{t('lessons.mediaUrlInvalid')}</span></>
                ) : (
                  t('lessons.mediaUrlHelp')
                )}
              </p>
              {videoEmbed && (
                <div className="mt-3 max-w-md">
                  <LessonVideo mediaUrl={mediaUrl} title={title.en || 'preview'} />
                </div>
              )}
            </div>
          )}

          {contentType === 'link' && (
            <div>
              <label className={labelClass}>{t('lessons.fields.linkUrl')}</label>
              <input
                type="url"
                dir="ltr"
                value={mediaUrl}
                onChange={(e) => { setMediaUrl(e.target.value); setMediaErr(''); }}
                placeholder="https://…"
                className={cn(inputClass, linkInvalid && 'border-red-300 focus:border-red-400 focus:ring-red-200')}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {linkInvalid ? <span className="text-red-500">{t('lessons.linkInvalid')}</span> : t('lessons.linkHelp')}
              </p>
            </div>
          )}

          {contentType === 'audio' && (
            <MediaUploadField kind="audio" value={mediaFile} onChange={(f) => { setMediaFile(f); setMediaErr(''); }} />
          )}

          {contentType === 'pdf' && (
            <MediaUploadField kind="pdf" value={mediaFile} onChange={(f) => { setMediaFile(f); setMediaErr(''); }} />
          )}

          {mediaErr && <p className="text-[11px] text-red-600">{mediaErr}</p>}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {t('actions.cancel')}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-rmc-green px-5 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50"
        >
          {saving ? t('lessons.saving') : isEdit ? t('actions.save') : t('actions.create')}
        </button>
      </ModalFooter>
    </Modal>
  );
}
