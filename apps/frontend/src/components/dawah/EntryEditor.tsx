'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
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
 * Both halves are MARKDOWN, edited in a plain textarea and rendered server-side — the same
 * pipeline a member's question goes through. Deliberately not the RichTextEditor the rest
 * of the admin uses for CMS prose: that one emits HTML, and an entry whose answer is stored
 * as HTML would bake today's sanitiser into the database, exactly as the question body
 * already refuses to.
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
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState<PostLanguage>('en');

  useEffect(() => {
    dawahApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

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
        setAnswerBody(e.answerBody);
        // The raw stored value — null shows an empty box, so saving an untouched
        // form cannot silently promote a derived excerpt into an authored summary.
        setSummary(e.summary ?? '');
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
        body,
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
  const canSave = title.trim().length >= 10 && body.trim().length >= 20 && answerBody.trim().length >= 20;

  return (
    <Modal open onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>
          {entryId ? t('discussions.admin.editTitle') : t('discussions.admin.newTitle')}
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

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t('discussions.admin.answerLabel')}
              </label>
              <textarea
                value={answerBody}
                onChange={(e) => setAnswerBody(e.target.value)}
                dir={dir}
                rows={8}
                className={`${inputClass} font-mono text-[13px]`}
                placeholder={t('discussions.admin.answerPlaceholder')}
              />
              <p className="mt-1.5 text-xs text-gray-400">{t('discussions.admin.markdownHint')}</p>
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
