'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { dawahApi, ThrottledError, type PostLanguage } from '@/lib/dawahApi';

/**
 * Answer composer, embedded in the (server-rendered) thread page as a client island.
 *
 * A plain markdown textarea — NOT the TipTap editor. Members write markdown; the server
 * renders and sanitises it.
 *
 * When the category holds answers for review, the composer says so BEFORE submit
 * (`reviewNotice`) and, after submit, shows the author their own pending answer with an
 * honest note that only they can see it. A surprise queue reads as censorship; a
 * signposted one reads as care.
 */
export function AnswerComposer({
  slug,
  language,
  scholarReview,
  locked,
}: {
  slug: string;
  language: PostLanguage;
  scholarReview: boolean;
  locked: boolean;
}) {
  const t = useTranslations('dawah');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false); // posted, awaiting review
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  if (isLoading) return null;

  if (locked) {
    return (
      <p className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
        {t('discussions.answer.lockedNotice')}
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-600">{t('discussions.answer.signInToAnswer')}</p>
        <Link
          href={`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/dawah/discussions/${slug}`)}`}
          className="mt-3 inline-flex rounded-lg bg-rmc-green px-4 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark"
        >
          {t('discussions.ask.signIn')}
        </Link>
      </div>
    );
  }

  // After a pending submit, the answer is invisible to everyone but its author. Rather
  // than silently reload (where it would seem to vanish), say plainly what happened.
  if (pending) {
    return (
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-start gap-2 text-sm text-amber-800">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          {t('discussions.answer.pendingOwn')}
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const answer = await dawahApi.discussions.answer(slug, body);
      if (answer.status === 'pending_review') {
        setPending(true);
      } else {
        // Published immediately (open category) — reload so it appears in the thread.
        router.refresh();
        setBody('');
      }
    } catch (err) {
      setError(err instanceof ThrottledError ? err.message : t('discussions.answer.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6">
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
        {t('discussions.answer.yourAnswer')}
      </label>
      {scholarReview && (
        <p className="mb-2 flex items-start gap-2 rounded-lg bg-rmc-green-light px-3 py-2 text-xs text-rmc-green">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t('discussions.answer.reviewNotice')}
        </p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        dir={dir}
        rows={5}
        required
        minLength={20}
        className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
        placeholder={t('discussions.answer.answerPlaceholder')}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rmc-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? t('discussions.answer.posting') : t('discussions.answer.post')}
      </button>
    </form>
  );
}
