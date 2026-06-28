'use client';

import { Heart, MessageCircle, ArrowUpRight } from 'lucide-react';
import { XLogo } from '@/components/icons/XLogo';
import { pick, type SocialPost } from '@/lib/content-api';

/**
 * Native "Latest on X" column rendered from our own cached feed (the backend
 * pulls X's public syndication timeline). Reliable + styled in-house — no
 * dependency on X's client-side widget, which X rate-limits to a blank box.
 * Falls back to a branded "View on X" card when no tweets are available.
 */
export function TweetColumn({
  tweets,
  handle,
  profileUrl,
  locale,
  rtl,
  height = 420,
  ctaLabel = 'View on X',
}: {
  tweets: SocialPost[];
  handle: string;
  profileUrl: string;
  locale: string;
  rtl: boolean;
  height?: number;
  ctaLabel?: string;
}) {
  const items = tweets.slice(0, 6);

  if (!items.length) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center shadow-sm ring-1 ring-black/5 no-underline transition-colors hover:from-gray-100 hover:to-gray-200"
        style={{ minHeight: height }}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform group-hover:scale-110">
          <XLogo className="h-5 w-5" />
        </span>
        <span className={`text-sm font-semibold text-gray-500 ${rtl ? 'font-arabic' : ''}`}>
          {pick(
            {
              en: 'No posts to show right now',
              rw: 'Nta byanditswe bihari ubu',
              ar: 'لا توجد منشورات لعرضها حاليًا',
            },
            locale,
          )}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-4 py-1.5 text-xs font-bold text-white">
          {ctaLabel}
        </span>
      </a>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5"
      style={{ height }}
    >
      <div className="relative min-h-0 flex-1">
        <ul className="h-full divide-y divide-gray-100 overflow-y-auto">
        {items.map((t, i) => (
          <li key={t.url ?? i}>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 no-underline transition-colors hover:bg-gray-50"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white">
                  <XLogo className="h-3 w-3" />
                </span>
                <span className="truncate text-xs font-bold text-gray-900">{t.handle}</span>
                <span className="ms-auto shrink-0 text-xs text-gray-400">{t.date}</span>
              </div>
              <p
                className={`whitespace-pre-line text-sm leading-relaxed text-gray-700 line-clamp-5 ${rtl ? 'font-arabic' : ''}`}
                dir="auto"
              >
                {pick(t.content, locale)}
              </p>
              {t.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.image}
                  alt=""
                  className="mt-2 max-h-44 w-full rounded-lg object-cover"
                  loading="lazy"
                />
              )}
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                {t.likes !== '0' && (
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {t.likes}
                  </span>
                )}
                {t.comments !== '0' && (
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t.comments}
                  </span>
                )}
              </div>
            </a>
          </li>
        ))}
        </ul>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent"
        />
      </div>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 border-t border-gray-100 py-2.5 text-center text-xs font-bold text-rmc-green no-underline transition-colors hover:bg-gray-50"
      >
        {ctaLabel}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
