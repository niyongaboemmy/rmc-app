'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useToast } from '@/components/ui/Toast';
import { localized } from './localize';
import {
  dawahApi, serverMessage,
  type DawahCategory, type PostLanguage,
} from '@/lib/dawahApi';

const LANGUAGES: PostLanguage[] = ['en', 'rw', 'ar'];
const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green';

/**
 * Author or edit one Q&A entry.
 *
 * Both halves are MARKDOWN and rendered server-side — the same pipeline a member's
 * question goes through, and the same reason: stored markdown is inert, so a future bug in
 * the read-time sanitiser cannot release a payload already sitting in the database.
 *
 * The ANSWER is nonetheless written in the RichTextEditor, because asking whoever knows the
 * ruling to also know markdown is asking the wrong person for the wrong thing. Storage does
 * not change: `onChangeMarkdown` serialises the editor's own document back to markdown on
 * every keystroke (see lib/markdown/fromProseMirror.ts), and the HTML the editor is seeded
 * with — rendered by the server, so it matches the public page exactly — is never sent
 * anywhere. What is stored is what was always stored.
 *
 * The QUESTION stays a plain textarea. It is usually the member's own words, pasted or
 * lightly corrected, and round-tripping somebody else's text through a rich editor to
 * normalise its markdown is a change nobody asked for.
 *
 * Editing an existing entry is SILENT: it does not re-notify the asker. Fixing a typo must
 * not email somebody "your question has been answered" a second time.
 */
export function EntryEditor({
  entryId,
  onClose,
  onSaved,
}: {
  /** null = compose a new entry. */
  entryId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [loading, setLoading] = useState(entryId !== null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [answerBody, setAnswerBody] = useState('');
  const [summary, setSummary] = useState('');
  /**
   * The entry's staff-facing number. For an existing entry it is what was
   * assigned; for a new one it is a PREVIEW of what the next insert will get.
   *
   * Preview, not a reservation: the value is assigned server-side, so if another
   * admin saves first this one shifts by one. That is why it is displayed rather
   * than submitted — nothing here can create a duplicate.
   */
  const [entryNumber, setEntryNumber] = useState<number | null>(null);
  const [isEssential, setIsEssential] = useState(false);
  const [answerSummary, setAnswerSummary] = useState('');
  /**
   * The answer as HTML, purely to SEED TipTap — it is never sent anywhere.
   * `answerBody` remains the markdown of record, updated from the editor's own
   * document on every keystroke. Kept in state rather than derived so the editor
   * is not re-seeded mid-edit, which would move the cursor.
   */
  const [answerHtml, setAnswerHtml] = useState('');
  const [answerReady, setAnswerReady] = useState(false);
  /**
   * Whether this entry HAD question detail when it was opened. Latched at load
   * rather than derived from `body`, so clearing the box does not make it vanish
   * mid-edit — which would strand whatever the admin was part-way through fixing.
   */
  const [hasDetail, setHasDetail] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState<PostLanguage>('en');

  useEffect(() => {
    dawahApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  /**
   * Seed the rich editor from the stored markdown.
   *
   * Rendered by the SERVER, through the same render+sanitise pipeline the public
   * page uses — so what the admin edits is what a reader sees, rather than a
   * second opinion from a client-side markdown library. `marked` is ESM-only and
   * not bundled for the client anyway.
   *
   * A new entry starts blank and is ready immediately. An existing one waits, so
   * TipTap is not mounted with empty content and then re-seeded — remounting on
   * `answerReady` is what keeps the initial content from being lost.
   */
  useEffect(() => {
    if (entryId === null) {
      setAnswerReady(true);
      return;
    }
    if (!answerBody) return;
    let cancelled = false;
    dawahApi.discussions
      .preview(answerBody)
      .then((r) => !cancelled && setAnswerHtml(r.html))
      // Falling back to the raw markdown keeps the text editable rather than
      // presenting an empty box over an answer that does exist.
      .catch(() => !cancelled && setAnswerHtml(`<p>${answerBody}</p>`))
      .finally(() => !cancelled && setAnswerReady(true));
    return () => {
      cancelled = true;
    };
    // Seeds ONCE per entry: re-running as `answerBody` changes would re-render and
    // re-seed on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, answerBody !== '']);

  /**
   * A NEW entry has no number yet, so ask what the next one will be.
   *
   * Failure is silent: the number is a convenience for referring to an entry, and
   * refusing to let an admin write one because a display field could not load
   * would be the wrong trade. The header simply omits it.
   */
  useEffect(() => {
    if (entryId !== null) return;
    let cancelled = false;
    dawahApi.admin.discussions
      .nextEntryNumber()
      .then((r) => !cancelled && setEntryNumber(r.nextEntryNumber))
      .catch(() => !cancelled && setEntryNumber(null));
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  useEffect(() => {
    if (entryId === null) return;
    let cancelled = false;
    setLoading(true);
    dawahApi.admin.discussions
      .entry(entryId)
      .then((e) => {
        if (cancelled) return;
        setTitle(e.title);
        setBody(e.body);
        setHasDetail(!!e.body?.trim());
        setAnswerBody(e.answerBody);
        // The raw stored value — null shows an empty box, so saving an untouched
        // form cannot silently promote a derived excerpt into an authored summary.
        setSummary(e.summary ?? '');
        setEntryNumber(e.entryNumber);
        setIsEssential(e.isEssential);
        setAnswerSummary(e.answerSummary ?? '');
        setCategoryId(e.categoryId ?? '');
        setLanguage(e.language);
      })
      .catch(() => !cancelled && toastError(t('discussions.admin.loadError')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // toastError/t are stable enough for this one-shot load; re-running on their identity
    // would refetch the entry and discard whatever the admin has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        // Omitted entirely when the entry has no detail, so updateEntry's
        // `!== undefined` check leaves the stored value alone.
        ...(hasDetail ? { body } : {}),
        isEssential,
        answerSummary: answerSummary.trim(),
        answerBody,
        summary: summary.trim(),
        categoryId: categoryId || undefined,
        language,
      };
      if (entryId) await dawahApi.admin.discussions.updateEntry(entryId, payload);
      else await dawahApi.admin.discussions.createEntry(payload);
      success(t('discussions.admin.saved'));
      onSaved();
    } catch (err) {
      toastError(serverMessage(err) ?? t('discussions.admin.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  // No `body` requirement: an admin-authored entry has no separate detail, and the
  // server treats it as optional too.
  const canSave = title.trim().length >= 10 && answerBody.trim().length >= 20;

  /**
   * `2xl` (56rem), widened from the `lg` (32rem) this opened at.
   *
   * That was a sensible width for the three-field form this used to be. It now
   * holds a title, two summaries, a category, a language, the curation checkbox
   * and a rich-text answer — and at 32rem the editor gave roughly forty characters
   * of line to write a long ruling in.
   *
   * Not the widest available: past this, lines get long enough to be hard to read
   * back, which is the opposite of what an authoring form is for. The toolbar
   * wraps, so it is not what sets the width.
   */
  return (
    <Modal open onClose={onClose} size="2xl">
      <ModalHeader>
        <ModalTitle>
          <span className="flex flex-wrap items-baseline gap-2">
            {entryId ? t('discussions.admin.editTitle') : t('discussions.admin.newTitle')}
            {/* Generated, never typed — so it is shown as a label rather than a
                field. On a new entry it is what the next insert will receive. */}
            {entryNumber !== null && (
              <span className="rounded-full bg-rmc-green-light px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-rmc-green">
                {t('discussions.admin.entryNumber', { number: entryNumber })}
              </span>
            )}
          </span>
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-rmc-green" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t('discussions.ask.titleLabel')}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                dir={dir}
                maxLength={200}
                className={inputClass}
                placeholder={t('discussions.ask.titlePlaceholder')}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-gray-700">
                <span>{t('discussions.admin.summaryLabel')}</span>
                <span className="text-[11px] font-normal tabular-nums text-gray-400">
                  {summary.length}/320
                </span>
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                dir={dir}
                rows={2}
                maxLength={320}
                className={inputClass}
                placeholder={t('discussions.admin.summaryPlaceholder')}
              />
              {/* Says what happens when it is left blank, so an admin in a hurry knows
                  the row will not be empty — it falls back to an excerpt of the answer. */}
              <p className="mt-1 text-[11px] leading-snug text-gray-400">
                {t('discussions.admin.summaryHint')}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('discussions.ask.categoryLabel')}
                </label>
                <SearchableSelect
                  value={categoryId}
                  onChange={setCategoryId}
                  options={[
                    { value: '', label: t('discussions.ask.noCategory') },
                    ...categories.map((c) => ({ value: c.id, label: localized(c, 'name', locale) })),
                  ]}
                  size="md"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('discussions.ask.languageLabel')}
                </label>
                <SearchableSelect
                  value={language}
                  onChange={(v) => setLanguage(v as PostLanguage)}
                  options={LANGUAGES.map((l) => ({ value: l, label: t(`library.language.${l}`) }))}
                  size="md"
                />
              </div>
            </div>

            {/* Curation, not a property of the question — so it sits apart from the
                fields that describe one. The hint says where ticking it puts the
                entry, because "essential" alone does not say what it does. */}
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50/60 px-3.5 py-3">
              <input
                type="checkbox"
                checked={isEssential}
                onChange={(e) => setIsEssential(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-rmc-green focus:ring-rmc-green"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-700">
                  {t('discussions.admin.essentialLabel')}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">
                  {t('discussions.admin.essentialHint')}
                </span>
              </span>
            </label>

            {/* Extra detail beneath the question — shown ONLY for an entry that already
                has some, which in practice means a member's submission where the asker
                explained their situation. It stays editable so that text can be tidied.

                A NEW entry does not get this box. Both fields were labelled "Question",
                and on an admin-authored entry the title IS the question — the second box
                only invited it to be typed twice, or left the detail page showing the
                same sentence in two places. */}
            {hasDetail && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('discussions.admin.questionLabel')}
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  dir={dir}
                  rows={5}
                  className={`${inputClass} font-mono text-[13px]`}
                  placeholder={t('discussions.admin.questionPlaceholder')}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t('discussions.admin.answerLabel')}
              </label>
              {/* Written rich, STORED as markdown: `onChangeMarkdown` serialises the
                  editor's own document, and the HTML is only ever the seed. The
                  entity refuses stored HTML for a reason — see fromProseMirror.ts.

                  Keyed on `answerReady` so the editor mounts once the seed has
                  arrived: its content is uncontrolled after mount, so mounting it
                  empty and setting the value afterwards would show a blank box over
                  an existing answer. */}
              {/* The ruling in short, above the answer it summarises — which is also
                  where it renders for the reader. Kept apart from "Summary for the
                  list" at the top of this form: that one sells the entry, this one
                  states the outcome. */}
              <div className="mb-3">
                <label className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-gray-700">
                  <span>{t('discussions.admin.answerSummaryLabel')}</span>
                  <span className="text-[11px] font-normal tabular-nums text-gray-400">
                    {answerSummary.length}/600
                  </span>
                </label>
                <textarea
                  value={answerSummary}
                  onChange={(e) => setAnswerSummary(e.target.value)}
                  dir={dir}
                  rows={3}
                  maxLength={600}
                  className={inputClass}
                  placeholder={t('discussions.admin.answerSummaryPlaceholder')}
                />
                <p className="mt-1 text-[11px] leading-snug text-gray-400">
                  {t('discussions.admin.answerSummaryHint')}
                </p>
              </div>

              {answerReady ? (
                <RichTextEditor
                  key={`answer-${entryId ?? 'new'}`}
                  value={answerHtml}
                  onChange={() => {}}
                  onChangeMarkdown={setAnswerBody}
                  dir={dir}
                />
              ) : (
                <div className="flex justify-center rounded-lg border border-gray-200 py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-rmc-green" />
                </div>
              )}
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          {t('discussions.admin.cancel')}
        </Button>
        <Button onClick={save} isLoading={saving} disabled={!canSave || loading}>
          {entryId ? t('discussions.admin.save') : t('discussions.admin.publish')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
