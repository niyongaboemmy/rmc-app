'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plus, Pencil, Trash2, X, RefreshCw, GraduationCap, LayoutGrid, Globe, Lock, Loader2,
} from 'lucide-react';
import {
  type ScholarshipProgram, type I18nText, type RequiredDocument,
} from '@/lib/scholarshipApi';
import {
  scholarshipAdminApi, type CreateScholarshipProgramPayload,
} from '@/lib/scholarshipAdminApi';
import { cn } from '@/lib/utils';
import { ModalPortal } from '@/components/ui/Modal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ContentKeys, getSiteContent, SCHOLARSHIP_SERVICE_DEFAULT } from '@/lib/content-api';
import { boardLevels, type BoardLevel } from '@/lib/content/service-boards';

/**
 * Composing and publishing scholarships — extracted from the admin page when
 * the sidebar gained submenus. Each job a scholarship administrator does now has
 * its own ROUTE (manage / applications / reports) rather than being a tab whose
 * state lives in one component, because a submenu needs somewhere to link to.
 */

/**
 * The education levels, read from the Scholarships CMS section rather than
 * hardcoded here. `boardLevels` takes the saved list exactly as stored, so a
 * level an admin deleted stays deleted instead of the seed coming back.
 *
 * English labels: this is the admin console, which is English throughout. The
 * public pages resolve the same ids through `pick()` in the reader's locale.
 */
function useLevels(): BoardLevel[] {
  const [levels, setLevels] = useState<BoardLevel[]>(SCHOLARSHIP_SERVICE_DEFAULT.levels);
  useEffect(() => {
    let active = true;
    getSiteContent(ContentKeys.scholarshipService)
      .then((data) => {
        if (active) setLevels(boardLevels(data, SCHOLARSHIP_SERVICE_DEFAULT));
      })
      // The seeded three are already in state; a failed read leaves the form
      // usable rather than showing an empty dropdown.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return levels;
}

const levelLabelEn = (levels: BoardLevel[], key: string | null): string =>
  levels.find((l) => l.id === key)?.label.en || '';

// ── Program form modal ──────────────────────────────────────────────────────

type I18nDraft = { en: string; rw: string; ar: string };
const EMPTY_I18N: I18nDraft = { en: '', rw: '', ar: '' };
const LANGS: Array<{ code: keyof I18nDraft; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'ar', label: 'العربية' },
];

/** A missing i18n object is a row authored before the trilingual fields existed. */
/**
 * Whether a rich-text value actually says anything.
 *
 * An "empty" editor is not an empty string — TipTap serialises an untouched
 * document as `<p></p>`, so a plain `.trim()` check would read a blank
 * description as filled and let a scholarship be published with nothing in it.
 * Tags are stripped and the remainder tested, which also catches `<p><br></p>`
 * and a paragraph holding only a non-breaking space.
 */
function hasRichText(html: string | null | undefined): boolean {
  return (html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim().length > 0;
}

function toDraft(value: I18nText | null | undefined): I18nDraft {
  return value ? { en: value.en ?? '', rw: value.rw ?? '', ar: value.ar ?? '' } : { ...EMPTY_I18N };
}

/** One trilingual field: the tab above chooses which language is edited. */
function I18nField({
  label, hint, lang, value, onChange, rows,
}: {
  label: string;
  hint?: string;
  lang: keyof I18nDraft;
  value: I18nDraft;
  onChange: (next: I18nDraft) => void;
  rows?: number;
}) {
  const filled = LANGS.filter((l) => value[l.code]?.trim()).map((l) => l.code.toUpperCase());
  const cls =
    'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {/* Which languages already have copy — otherwise a tabbed form hides
            whether Kinyarwanda was ever filled in. */}
        <span className="text-[10px] font-semibold tracking-wider text-gray-400">
          {filled.length ? filled.join(' · ') : 'EMPTY'}
        </span>
      </div>
      {rows ? (
        <textarea
          rows={rows}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          value={value[lang]}
          onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          value={value[lang]}
          onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
          className={cls}
        />
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ProgramModal({
  program,
  onClose,
  onSaved,
}: {
  program: ScholarshipProgram | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(program?.title ?? '');
  const levels = useLevels();
  const [level, setLevel] = useState<string>(program?.level ?? '');
  const [slots, setSlots] = useState(program?.slots != null ? String(program.slots) : '');
  const [opensAt, setOpensAt] = useState(program?.opensAt ? program.opensAt.slice(0, 10) : '');
  const [deadline, setDeadline] = useState(
    program?.deadline ? program.deadline.slice(0, 10) : '',
  );

  // Trilingual copy. The `lang` tab only switches which language is being typed;
  // all three are held at once and saved together.
  const [lang, setLang] = useState<'en' | 'rw' | 'ar'>('en');
  const [titleI18n, setTitleI18n] = useState<I18nDraft>(toDraft(program?.titleI18n));
  // English is seeded from the fallback column when the row has no English of
  // its own. Without it, a scholarship whose text lives only in `description`
  // opens with an empty editor and cannot be saved, since English is the
  // required tab — a public page its own author is locked out of editing.
  const [descI18n, setDescI18n] = useState<I18nDraft>(() => {
    const draft = toDraft(program?.descriptionI18n);
    if (!hasRichText(draft.en) && program?.description) draft.en = program.description;
    return draft;
  });

  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>(
    program?.requiredDocuments ?? [],
  );
  const [newDocLabel, setNewDocLabel] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    // The fallback columns are what a locale with no translation renders, so
    // default them to the English tab rather than making the admin type the
    // same words twice into a collapsed section they may never open.
    const fallbackTitle = (title.trim() || titleI18n.en.trim()).trim();
    // The fallback is no longer typed separately: it IS the English description.
    // Two boxes for one text meant an admin could fill the rich one and leave a
    // stale plain-text fallback for every locale without a translation.
    const fallbackDescription = descI18n.en.trim();

    if (!fallbackTitle || !hasRichText(fallbackDescription)) {
      setError('A title and description are required — fill in the English tab at minimum.');
      return;
    }
    setSaving(true);
    setError('');
    const payload: CreateScholarshipProgramPayload = {
      title: fallbackTitle,
      description: fallbackDescription,
      titleI18n,
      descriptionI18n: descI18n,
      requiredDocuments: requiredDocs,
      level: (level || undefined) as CreateScholarshipProgramPayload['level'],
      slots: slots ? Number(slots) : undefined,
      opensAt: opensAt || undefined,
      deadline: deadline || undefined,
    };
    try {
      if (program) {
        await scholarshipAdminApi.updateProgram(program.id, payload);
      } else {
        await scholarshipAdminApi.createProgram(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Failed to save program',
      );
    } finally {
      setSaving(false);
    }
  };

  /** Adds a required document, keyed off the English label so the key is stable and readable. */
  const addRequiredDoc = () => {
    const label = newDocLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    if (!key || requiredDocs.some((d) => d.key === key)) {
      setNewDocLabel('');
      return;
    }
    setRequiredDocs([...requiredDocs, { key, label: { en: label, rw: '', ar: '' }, required: true }]);
    setNewDocLabel('');
  };

  return (
    /* Portaled to <body>. Rendered in place it stayed inside the admin shell's scrolling
       <main>, so its backdrop covered the content column rather than the viewport, and
       its z-index was resolved against whatever stacking context an ancestor happened to
       create rather than against the page. Every other modal in this area already
       portals — this one was the exception. */
    <ModalPortal>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">{program ? 'Edit scholarship' : 'New scholarship'}</h3>
            {program && (
              <p className="mt-0.5 text-xs text-gray-400">
                <span className="font-mono">{program.slug ?? '—'}</span>
                {' · '}
                <span className="uppercase tracking-wider">{program.status}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language tabs. Saving writes all three at once — this only chooses
            which one you are typing into. */}
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                lang === l.code ? 'bg-white text-rmc-green shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <I18nField label="Title" lang={lang} value={titleI18n} onChange={setTitleI18n} />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <span className="text-[10px] font-semibold tracking-wider text-gray-400">
                  {LANGS.filter((l) => hasRichText(descI18n[l.code]))
                    .map((l) => l.code.toUpperCase())
                    .join(' \u00b7 ') || 'EMPTY'}
                </span>
              </div>
              {/* Keyed by language: the editor seeds its content once and is
                  uncontrolled after mount, so switching tabs without a remount
                  would leave the previous language's text in the box. Same
                  reason as HajjDescriptionSection. */}
              <RichTextEditor
                key={lang}
                value={descI18n[lang]}
                onChange={(html) => setDescI18n((d) => ({ ...d, [lang]: html }))}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                fontClassName={lang === 'ar' ? 'font-arabic' : ''}
              />
              <p className="mt-1 text-xs text-gray-400">
                Everything an applicant reads: what the scholarship is, who may apply, what it
                covers and what it is worth. Use headings to break it up.
              </p>
            </div>

          {/* The single-language fallback the public page uses when a locale is
              missing. Kept visible rather than hidden, so it is obvious it exists. */}
          <details className="rounded-lg border border-gray-200 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-gray-500">
              Fallback title (used when a language above is empty)
            </summary>
            <div className="mt-3 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Fallback title"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              />
              <p className="text-xs text-gray-400">
                The description has no separate fallback \u2014 the English tab is what a locale
                without its own translation renders.
              </p>
            </div>
          </details>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as typeof level)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              >
                <option value="">Any level</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label.en || l.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Awards available</label>
              <input
                type="number"
                min={1}
                value={slots}
                onChange={(e) => setSlots(e.target.value)}
                placeholder="Leave blank if unspecified"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference no.</label>
              {/* Allocated by the server when the programme is created, and frozen
                  after — a reference already quoted in a letter must not change
                  because the programme was renamed. Shown, never typed. */}
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                {program?.referenceNumber ?? (
                  <span className="text-gray-400">Assigned when you save</span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Opens</label>
              <input
                type="date"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              />
              <p className="mt-1 text-xs text-gray-400">Blank = as soon as published</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              />
              <p className="mt-1 text-xs text-gray-400">Required to publish</p>
            </div>
          </div>

          {/* Required documents — drives the applicant's upload step. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Documents the applicant must attach
            </label>
            {requiredDocs.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {requiredDocs.map((doc) => (
                  <li
                    key={doc.key}
                    className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-700">{doc.label.en || doc.key}</span>
                    <button
                      type="button"
                      onClick={() => setRequiredDocs(requiredDocs.filter((d) => d.key !== doc.key))}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                value={newDocLabel}
                onChange={(e) => setNewDocLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  addRequiredDoc();
                }}
                placeholder="e.g. Latest school report"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              />
              <button
                type="button"
                onClick={addRequiredDoc}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Programs tab ─────────────────────────────────────────────────────────────

export function ScholarshipProgramsTab({ canManage }: { canManage: boolean }) {
  const levels = useLevels();
  const { locale } = useParams<{ locale: string }>();
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ScholarshipProgram | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      setPrograms(await scholarshipAdminApi.listPrograms());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const [actionError, setActionError] = useState('');
  /**
   * The row whose publish/close is in flight.
   *
   * Both actions were fire-and-forget with no feedback: the row sat unchanged
   * until the refetch landed, so the natural response to a slow request was to
   * click again — and the second click sent a second request.
   */
  const [busyId, setBusyId] = useState<string | null>(null);

  /** Surfaces the server's own refusal — "cannot publish without: deadline" is
   *  far more useful than a generic failure toast. */
  const serverMessage = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
      ?.message ?? fallback;

  const handlePublish = async (p: ScholarshipProgram) => {
    // Reopening a closed scholarship runs the same endpoint, so the wording
    // follows the row rather than the handler.
    const reopening = p.status === 'closed';
    const question = reopening
      ? `Reopen "${p.title}"? It starts accepting applications again.`
      : `Publish "${p.title}"? It becomes visible to applicants immediately.`;
    if (!confirm(question)) return;
    setActionError('');
    setBusyId(p.id);
    try {
      await scholarshipAdminApi.publishProgram(p.id);
      await fetchPrograms();
    } catch (err) {
      setActionError(
        serverMessage(err, `Could not ${reopening ? 'reopen' : 'publish'} this scholarship.`),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleClose = async (p: ScholarshipProgram) => {
    if (!confirm(`Close "${p.title}"? No new applications will be accepted. Applications already submitted continue through review.`)) return;
    setActionError('');
    setBusyId(p.id);
    try {
      await scholarshipAdminApi.closeProgram(p.id);
      await fetchPrograms();
    } catch (err) {
      setActionError(serverMessage(err, 'Could not close this scholarship.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scholarship? This cannot be undone.')) return;
    setActionError('');
    try {
      await scholarshipAdminApi.deleteProgram(id);
      await fetchPrograms();
      return;
    } catch (err) {
      // The server refuses to delete one that already has applications.
      setActionError(serverMessage(err, 'Could not delete this scholarship.'));
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {actionError}
        </p>
      )}
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rmc-green hover:bg-rmc-green-dark text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Program
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-rmc-green animate-spin" />
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No scholarship programs yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3.5 font-medium text-gray-600">Title</th>
                  <th className="text-left px-4 py-3.5 font-medium text-gray-600">Level</th>
                  <th className="text-left px-4 py-3.5 font-medium text-gray-600">Deadline</th>
                  <th className="text-left px-4 py-3.5 font-medium text-gray-600">Status</th>
                  {canManage && <th className="px-4 py-3.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {programs.map((p) => (
                  <tr key={p.id} className="hover:bg-rmc-green-light/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-xs">{p.description}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      {levelLabelEn(levels, p.level) || 'Any level'}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      {p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4">
                      {/* Three states, not two: a draft is neither open nor
                          closed, and showing it as "Closed" would hide the
                          fact that it was never published. */}
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        p.status === 'published' && 'bg-green-100 text-green-700',
                        p.status === 'draft' && 'bg-amber-100 text-amber-700',
                        p.status === 'closed' && 'bg-gray-100 text-gray-500',
                      )}>
                        {p.status === 'published' ? 'Published' : p.status === 'draft' ? 'Draft' : 'Closed'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {/* Straight to this scholarship's review pipeline —
                              the board is per-scholarship, so it needs an entry
                              point per row rather than one global link. */}
                          <Link
                            href={`/${locale}/admin/scholarship/board/${p.id}`}
                            aria-label="Review board"
                            title="Review board"
                            className="text-gray-400 transition-colors hover:text-rmc-green"
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </Link>
                          {/* The two state changes are the consequential actions in
                              this row, and they used to be the least visible thing
                              in it: bare text among four icon buttons, reading as
                              labels rather than controls.

                              Icon AND word, not icon alone. An icon by itself would
                              be quicker to scan and worse to be sure about — these
                              put a scholarship in front of the public or stop it
                              taking applications, and neither is a guess worth
                              inviting. The pill gives them the affordance the
                              neutral row icons deliberately do not have.

                              BOTH are always rendered, the inapplicable one
                              disabled, rather than showing only the one that
                              applies. Rendering conditionally meant a screen where
                              every scholarship happened to be published showed no
                              Publish button at all, so nothing on the page said the
                              action existed — and the controls shifted position
                              between rows, so the column could not be scanned. A
                              disabled button with a reason says "not from here",
                              which is what an admin needs to know. */}
                          <button
                            onClick={() => handlePublish(p)}
                            disabled={busyId === p.id || p.status === 'published'}
                            title={
                              p.status === 'published'
                                ? 'Already published'
                                : p.status === 'closed'
                                  ? 'Start accepting applications again'
                                  : 'Make this scholarship visible to applicants'
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rmc-green/25 bg-rmc-green-light/60 px-2.5 py-1 text-xs font-semibold text-rmc-green transition-colors enabled:hover:bg-rmc-green enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busyId === p.id && p.status !== 'published' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Globe className="h-3.5 w-3.5" />
                            )}
                            {/* Publishing a CLOSED scholarship reopens it — same
                                endpoint, different thing to a reader. */}
                            {p.status === 'closed' ? 'Reopen' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleClose(p)}
                            disabled={busyId === p.id || p.status !== 'published'}
                            title={
                              p.status === 'closed'
                                ? 'Already closed'
                                : p.status === 'draft'
                                  ? 'Publish it before you can close it'
                                  : 'Stop accepting new applications; submitted ones continue through review'
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors enabled:hover:bg-amber-500 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busyId === p.id && p.status === 'published' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                            Close
                          </button>
                          <button onClick={() => setEditing(p)} aria-label="Edit" className="text-gray-400 hover:text-rmc-green transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} aria-label="Delete" className="text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(editing || creating) && (
        <ProgramModal
          program={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={fetchPrograms}
        />
      )}
    </div>
  );
}

