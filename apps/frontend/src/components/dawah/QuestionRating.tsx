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

export function QuestionRating({
  slug,
  copy,
}: {
  slug: string;
  /**
   * The two editorial strings, resolved by the server page from the CMS.
   *
   * Passed in rather than read from a content provider so this component does not drag
   * the whole discussions blob — every listing string included — into the entry page's
   * HTML payload for two fields. The rest of its labels are UI grammar and stay in the
   * i18n messages: "Yes"/"No" name the buttons, and the failure line is a system message,
   * neither of which is RMC's editorial voice.
   */
  copy: {
    prompt: string;
    thanks: string;
    suggestPrompt: string;
    reasonPrompt: string;
    /** One reason per line — see DiscussionsContent.detail.ratingReasons. */
    reasons: string;
  };
}) {
  const t = useTranslations('dawah');
  const [choice, setChoice] = useState<boolean | null>(null);
  const [pending, setPending] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  /** Set once the follow-up has been sent — or skipped. Then the widget rests. */
  const [done, setDone] = useState(false);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  /**
   * The reason options, one per line.
   *
   * Blank lines dropped so an admin can space the list out while editing it, and
   * trimmed because a trailing space on an option becomes a trailing space in the
   * stored feedback.
   */
  const reasons = copy.reasons
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);

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
      if (prior === 'yes' || prior === 'no') {
        setChoice(prior === 'yes');
        // They have already been asked the follow-up; do not ask again.
        setDone(true);
      }
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
      // Switching sides after answering: clear what was typed for the other form,
      // or a reason picked under "No" would be sent along with a "Yes".
      setComment('');
      setEmail('');
      setReason('');
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

  /**
   * Send the follow-up against the SAME rating.
   *
   * The verdict is already stored — it was written the moment the button was
   * pressed, so a reader who says "No" and closes the tab still counts. This is a
   * second call carrying the same verdict plus the detail, and the server's upsert
   * attaches it to that row rather than creating another.
   */
  async function sendFeedback() {
    if (choice === null || sending) return;
    const key = voterKey();
    if (!key) {
      setFailed(true);
      return;
    }

    setSending(true);
    setFailed(false);
    try {
      /**
       * Only the fields belonging to the form that was shown.
       *
       * This overlaps with the clearing done when the verdict is switched, and the
       * two are NOT the same job: that one is for the reader, so a stale answer is
       * not left visible in a form they have moved away from; this one is for the
       * server, so a payload can never carry the other form's field whatever route
       * the state arrived by. Removing either alone leaves the current behaviour
       * intact, which is exactly why both are written down.
       */
      await dawahApi.discussions.rate(slug, choice, key, {
        reason: choice ? undefined : reason || undefined,
        comment: choice ? comment.trim() || undefined : undefined,
        email: choice ? email.trim() || undefined : undefined,
      });
      setDone(true);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50/60 p-4 text-center">
        <p className="inline-flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-rmc-green" aria-hidden />
          {copy.thanks}
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
          {copy.prompt}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => rate(true)}
            disabled={pending !== null}
            className={`${btn} ${
              choice === true
                ? 'border-rmc-green bg-rmc-green text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-rmc-green hover:text-rmc-green'
            }`}
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
            className={`${btn} ${
              choice === false
                ? 'border-rmc-green bg-rmc-green text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900'
            }`}
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

      {/* The follow-up. Which form appears is the whole point of the toggle: after
          "Yes" there is nothing wrong to report, so it asks for suggestions; after
          "No" the useful thing is WHY, which is a short list rather than an essay.
          Both are optional — the verdict is already recorded, and a reader who
          stops here has still told RMC what it most needed to know. */}
      {choice !== null && (
        <div className="mt-4 border-t border-gray-200 pt-4 text-start">
          <p className="text-center text-sm font-semibold text-gray-800">
            {choice ? copy.suggestPrompt : copy.reasonPrompt}
          </p>

          {choice ? (
            <div className="mx-auto mt-3 max-w-md space-y-3">
              <div>
                <label htmlFor="rating-comment" className="mb-1 block text-xs text-gray-600">
                  {t('discussions.rating.commentLabel')}
                </label>
                <textarea
                  id="rating-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder={t('discussions.rating.commentLabel')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
                />
              </div>
              <div>
                <label htmlFor="rating-email" className="mb-1 block text-xs text-gray-600">
                  {t('discussions.rating.emailLabel')}
                </label>
                <input
                  id="rating-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={160}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto mt-3 max-w-md">
              <label htmlFor="rating-reason" className="mb-1 block text-xs text-gray-600">
                {t('discussions.rating.reasonLabel')}
              </label>
              <select
                id="rating-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
              >
                <option value="">{t('discussions.rating.reasonLabel')}</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={sendFeedback}
              // Nothing to send is not an error: after "No" with no reason picked
              // there is no message, and the button would post an empty one.
              disabled={sending || (!choice && !reason)}
              className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rmc-green-dark disabled:opacity-50"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t('discussions.rating.send')}
            </button>
          </div>
        </div>
      )}

      {failed && (
        <p role="status" className="mt-3 text-xs text-red-600">
          {t('discussions.rating.failed')}
        </p>
      )}
    </div>
  );
}
