'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Eye, Loader2, Pencil, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { localized } from './localize';
import {
  dawahApi, ThrottledError,
  type DawahCategory, type PostLanguage,
} from '@/lib/dawahApi';

const LANGUAGES: PostLanguage[] = ['en', 'rw', 'ar'];
const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green';

/**
 * Ask a question.
 *
 * The editor is a PLAIN MARKDOWN TEXTAREA — deliberately NOT the RichTextEditor (TipTap)
 * the admin uses. That one emits HTML, and accepting HTML from a member means the whole
 * defence is the sanitiser never having a bug. Members write markdown; the server renders
 * and sanitises it.
 *
 * The preview renders through the SERVER's real pipeline (`discussions.preview`), not a
 * client markdown library — so what the reader previews is exactly what gets published,
 * with no second renderer to drift from the first.
 */
export function AskQuestionForm() {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState<PostLanguage>((locale as PostLanguage) || 'en');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dawahApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Fetch the preview when the reader switches to it — through the server, so it matches.
  useEffect(() => {
    if (tab !== 'preview' || !body.trim()) {
      setPreviewHtml('');
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    dawahApi.discussions
      .preview(body)
      .then((r) => !cancelled && setPreviewHtml(r.html))
      .catch(() => !cancelled && setPreviewHtml(''))
      .finally(() => !cancelled && setPreviewing(false));
    return () => {
      cancelled = true;
    };
  }, [tab, body]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const q = await dawahApi.discussions.create({
        title: title.trim(),
        body,
        categoryId: categoryId || undefined,
        language,
        isAnonymous,
      });
      router.push(`/${locale}/dawah/discussions/${q.slug}`);
    } catch (err) {
      // ThrottledError carries the server's honest "you're posting too quickly".
      setError(err instanceof ThrottledError ? err.message : t('discussions.ask.submitError'));
      setSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: '', label: t('discussions.ask.noCategory') },
    ...categories.map((c) => ({ value: c.id, label: localized(c, 'name', locale) })),
  ];
  const languageOptions = LANGUAGES.map((l) => ({ value: l, label: t(`library.language.${l}`) }));

  return (
    <div className="min-h-screen">
      <Navbar solid />
      <main className="pt-24 md:pt-28">
        <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
          <Link
            href={`/${locale}/dawah/discussions`}
            className="text-xs font-semibold text-gray-500 transition-colors hover:text-rmc-green"
          >
            ← {t('discussions.backToDiscussions')}
          </Link>
          <h1 className="mt-3 text-xl font-bold text-rmc-green-deep md:text-2xl">
            {t('discussions.ask.heading')}
          </h1>

          {authLoading ? null : !isAuthenticated ? (
            // Not signed in: posting requires auth, so ask for it rather than 401 on submit.
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-600">{t('discussions.ask.signInRequired')}</p>
              <Link
                href={`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/dawah/discussions/ask`)}`}
                className="mt-4 inline-flex rounded-lg bg-rmc-green px-4 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark"
              >
                {t('discussions.ask.signIn')}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  {t('discussions.ask.titleLabel')}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  dir={dir}
                  maxLength={200}
                  className={inputClass}
                  placeholder={t('discussions.ask.titlePlaceholder')}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    {t('discussions.ask.categoryLabel')}
                  </label>
                  <SearchableSelect value={categoryId} onChange={setCategoryId} options={categoryOptions} size="md" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    {t('discussions.ask.languageLabel')}
                  </label>
                  <SearchableSelect
                    value={language}
                    onChange={(v) => setLanguage(v as PostLanguage)}
                    options={languageOptions}
                    size="md"
                  />
                </div>
              </div>

              {/* Write / Preview — the preview is the SERVER's render, so it cannot lie. */}
              <div>
                <div className="mb-1.5 flex items-center gap-1">
                  <TabButton active={tab === 'write'} onClick={() => setTab('write')} icon={Pencil}>
                    {t('discussions.ask.write')}
                  </TabButton>
                  <TabButton active={tab === 'preview'} onClick={() => setTab('preview')} icon={Eye}>
                    {t('discussions.ask.preview')}
                  </TabButton>
                  <span className="ms-auto text-[11px] text-gray-400">{t('discussions.ask.markdownHint')}</span>
                </div>

                {tab === 'write' ? (
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    dir={dir}
                    rows={8}
                    className={`${inputClass} resize-y font-mono`}
                    placeholder={t('discussions.ask.bodyPlaceholder')}
                    required
                  />
                ) : (
                  <div className="min-h-[12rem] rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                    {previewing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : previewHtml ? (
                      <div
                        dir={dir}
                        className="prose prose-sm max-w-none text-gray-700 prose-a:text-rmc-green"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    ) : (
                      <p className="text-sm text-gray-400">{t('discussions.ask.nothingToPreview')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Anonymity: honest copy. Never imply RMC cannot see who asked. */}
              <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rmc-green focus:ring-rmc-green"
                />
                <span className="text-xs text-gray-600">
                  <span className="font-semibold">{t('discussions.ask.anonymousLabel')}</span>
                  <br />
                  {t('discussions.ask.anonymousHelp')}
                </span>
              </label>

              {error && (
                <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('discussions.ask.submit')}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Pencil;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
        active ? 'bg-rmc-green text-white' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}
