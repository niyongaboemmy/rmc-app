'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { dawahApi } from '@/lib/dawahApi';

/**
 * "Was this answer helpful?" on a published Q&A entry.
 *
 * The signal a view count cannot give: an entry that is being opened and failing looks
 * identical to one that is landing. This separates them so RMC can find the answers worth
 * rewriting.
 *
 * ── No tally is shown ───────────────────────────────────────────────────────────────
 *
 * Deliberate. The counts reach RMC through the admin list and stop there. Printing "3 of
 * 14 found this helpful" under a religious ruling turns a considered answer into a poll
 * on itself, and invites a reader to weigh the ruling by the vote rather than by its
 * substance. The reader gets an acknowledgement; the editors get the number.
 */

const STORAGE_KEY = 'rmc.dawah.voter';

/**
 * This browser's rating token, minted once and kept.
 *
 * Random and meaningless — it identifies a browser to the dedupe check and nothing else,
 * and the server only ever stores its hash. Kept out of a cookie on purpose: a cookie
 * would ride along on every request to the API for no reason, and this is needed on
 * exactly one call.
 *
 * Returns null when storage is unavailable — Safari's private mode throws on write, and
 * some readers block it outright. A rating without a token is refused by the server's
 * validation, so the widget hides rather than offering a button that cannot work.
 */
function voterKey(): string | null {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const minted = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, minted);
    return minted;
  } catch {
    return null;
  }
}

/** What this browser already said about this entry, so the widget can settle on reload. */
function ratedKey(slug: string): string {
  return `rmc.dawah.rated.${slug}`;
}

export function QuestionRating({ slug }: { slug: string }) {
  const t = useTranslations('dawah');
  const [choice, setChoice] = useState<boolean | null>(null);
  const [pending, setPending] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  /**
   * Storage is read in an effect, never during render.
   *
   * The server has no localStorage, so the first CLIENT render must match what the server
   * sent — the prompt — or React discards the markup and warns. The effect then swaps in
   * the thank-you for a reader who already rated this entry. Which means the common case
   * (never rated) paints correctly and immediately, and only a repeat visitor sees a brief
   * prompt before it settles. Gating the whole widget on the effect instead would make it
   * pop in late for everyone, to spare that one flash.
   */
  useEffect(() => {
    try {
      const prior = localStorage.getItem(ratedKey(slug));
      if (prior === 'yes' || prior === 'no') setChoice(prior === 'yes');
    } catch {
      // Storage blocked — the widget still works, it just cannot remember.
    }
  }, [slug]);

  async function rate(helpful: boolean) {
    if (pending !== null) return;

    const key = voterKey();
    if (!key) {
      // Storage refused, so there is no token and the server would reject the call. Say so
      // rather than leaving a button that silently does nothing when pressed.
      setFailed(true);
      return;
    }

    setPending(helpful);
    setFailed(false);
    try {
      await dawahApi.discussions.rate(slug, helpful, key);
      setChoice(helpful);
      try {
        localStorage.setItem(ratedKey(slug), helpful ? 'yes' : 'no');
      } catch {
        // Recorded server-side regardless; only the memory of it is lost.
      }
    } catch {
      // Say so rather than showing a thank-you for something that never landed.
      setFailed(true);
    } finally {
      setPending(null);
    }
  }

  if (choice !== null) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50/60 p-4 text-center">
        <p className="inline-flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-rmc-green" aria-hidden />
          {t('discussions.rating.thanks')}
        </p>
      </div>
    );
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60';

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50/60 p-4 text-center">
      {/* A fieldset-less group: the two buttons are one question, and a screen reader
          should hear the prompt as their label rather than as loose text above them. */}
      <div role="group" aria-labelledby="rating-prompt">
        <p id="rating-prompt" className="text-sm text-gray-600">
          {t('discussions.rating.prompt')}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => rate(true)}
            disabled={pending !== null}
            className={`${btn} border-gray-200 bg-white text-gray-700 hover:border-rmc-green hover:text-rmc-green`}
          >
            {pending === true ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ThumbsUp className="h-4 w-4" aria-hidden />
            )}
            {t('discussions.rating.yes')}
          </button>
          <button
            type="button"
            onClick={() => rate(false)}
            disabled={pending !== null}
            className={`${btn} border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900`}
          >
            {pending === false ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ThumbsDown className="h-4 w-4" aria-hidden />
            )}
            {t('discussions.rating.no')}
          </button>
        </div>
      </div>

      {failed && (
        <p role="status" className="mt-3 text-xs text-red-600">
          {t('discussions.rating.failed')}
        </p>
      )}
    </div>
  );
}
