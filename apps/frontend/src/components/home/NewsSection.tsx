'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, Bell, CalendarDays, Clock, Newspaper } from 'lucide-react';
import { publicApi } from '@/lib/public-api';
import {
  ContentKeys,
  NEWS_DEFAULT,
  ANNOUNCEMENTS_DEFAULT,
  isRtl,
  pick,
  type NewsContent,
  type AnnouncementsContent,
  type Locale,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';
import { readDeadline } from '@/lib/deadline';

/** A blog post as the home page needs it — resolved to one locale on the server. */
export interface NewsStory {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  /** Pre-formatted on the server so the first paint and hydration agree. */
  dateLabel: string;
}

type I18n = { en: string; rw: string; ar: string };

type Notice = {
  id: string;
  slug: string | null;
  title: string;
  titleI18n: I18n | null;
  priority: string;
  publishAt: string;
  expiresAt: string | null;
  type: string;
};

const MAX_NOTICES = 4;

function resolveText(i18n: I18n | null | undefined, fallback: string, locale: string): string {
  if (!i18n) return fallback;
  return i18n[locale as keyof I18n] || i18n.en || fallback;
}

const PRIORITY_RANK: Record<string, number> = { urgent: 3, high: 2 };

/** The API's own order (urgent, then high, then newest), kept across the merged lists. */
function byPriorityThenDate(a: Notice, b: Notice): number {
  const rank = (PRIORITY_RANK[b.priority] ?? 1) - (PRIORITY_RANK[a.priority] ?? 1);
  return rank || +new Date(b.publishAt) - +new Date(a.publishAt);
}

function deadlineColor(expiresAt: string | null): string {
  const deadline = readDeadline(expiresAt);
  if (deadline.closed) return 'text-gray-400';
  if (deadline.days === null) return 'text-rmc-green';
  if (deadline.days <= 3) return 'text-red-500';
  if (deadline.days <= 7) return 'text-amber-600';
  return 'text-rmc-green';
}

/**
 * Home-page "News": the three latest blog stories beside a live panel of
 * announcements and open tenders.
 *
 * Stories arrive as props (read on the server from the Blog & Posts store, so
 * they are in the first paint); notices are fetched on mount like the rest of
 * the API-driven sections.
 */
export function NewsSection({ stories }: { stories: NewsStory[] }) {
  const { locale } = useParams<{ locale: string }>();
  const lang = locale as Locale;
  const rtl = isRtl(locale);
  const arFont = rtl ? 'font-arabic' : '';
  const t = useTranslations('home.news');
  const tt = useTranslations('tenders');

  const { content, editing, setField } = useEditableContent<NewsContent>(
    ContentKeys.news,
    NEWS_DEFAULT,
  );
  // The notices panel keeps the Announcements section's own (admin-edited) title.
  const notices = useEditableContent<AnnouncementsContent>(
    ContentKeys.announcements,
    ANNOUNCEMENTS_DEFAULT,
  );

  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const results = await Promise.allSettled([
        publicApi.getAnnouncements('announcement', MAX_NOTICES, false),
        publicApi.getAnnouncements('tender', 3),
      ]);
      let merged: Notice[] = results
        .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
        .sort(byPriorityThenDate)
        .slice(0, MAX_NOTICES);

      // Nothing live right now — show the most recent past notices instead of an
      // empty panel (a lapsed tender reads "Closed").
      if (merged.length === 0) {
        merged = await publicApi.getAnnouncements(undefined, MAX_NOTICES, true).catch(() => []);
      }
      if (active) setItems(merged);
    })().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function deadlineLabel(expiresAt: string | null): string {
    const deadline = readDeadline(expiresAt);
    switch (deadline.state) {
      case 'none':
        return tt('filters.open');
      case 'closed':
        return tt('deadline.closed');
      case 'today':
        return tt('deadline.today');
      case 'tomorrow':
        return tt('deadline.tomorrow');
      default:
        return tt('deadline.inDays', { days: deadline.days });
    }
  }

  const dayFmt = new Intl.DateTimeFormat(locale, { day: '2-digit' });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'short' });

  const [featured, ...rest] = stories;

  return (
    <section id="news" className="relative scroll-mt-20 bg-transparent py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="max-w-2xl mx-auto text-center mb-10 md:mb-12">
          {editing ? (
            <InlineText
              as="h2"
              lang={locale}
              value={pick(content.title, locale)}
              editValue={content.title[lang]}
              onCommit={(v) => setField((d) => { d.title[lang] = v; })}
              className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${arFont}`}
              dir={rtl ? 'rtl' : 'ltr'}
              placeholder="Section title"
            />
          ) : (
            <h2
              className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${arFont}`}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {pick(content.title, locale)}
            </h2>
          )}

          <div className="ornament-divider max-w-xs mx-auto my-4" aria-hidden>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
          </div>

          {editing ? (
            <InlineText
              as="p"
              lang={locale}
              value={pick(content.lede, locale)}
              editValue={content.lede[lang]}
              onCommit={(v) => setField((d) => { d.lede[lang] = v; })}
              className={`text-gray-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed ${arFont}`}
              dir={rtl ? 'rtl' : 'ltr'}
              placeholder="Section lede"
            />
          ) : (
            <p
              className={`text-gray-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed ${arFont}`}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {pick(content.lede, locale)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8" dir={rtl ? 'rtl' : 'ltr'}>
          {/* ════════ LATEST STORIES — wider column ════════ */}
          <div className="lg:col-span-2 flex flex-col">
            <ColumnHeading
              icon={<Newspaper className="w-4 h-4 text-rmc-green" />}
              href={`/${locale}/blog`}
              linkLabel={t('allNews')}
              rtl={rtl}
            >
              {editing ? (
                <InlineText
                  as="h3"
                  lang={locale}
                  value={pick(content.storiesHeading, locale)}
                  editValue={content.storiesHeading[lang]}
                  onCommit={(v) => setField((d) => { d.storiesHeading[lang] = v; })}
                  className={`text-base md:text-lg font-bold text-gray-900 leading-tight ${arFont}`}
                  dir={rtl ? 'rtl' : 'ltr'}
                  placeholder="Column heading"
                />
              ) : (
                <h3 className={`text-base md:text-lg font-bold text-gray-900 leading-tight ${arFont}`}>
                  {pick(content.storiesHeading, locale)}
                </h3>
              )}
            </ColumnHeading>

            {!featured ? (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white/60 py-16 text-sm text-gray-400">
                {t('noStories')}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Featured — the newest story, full width with the photo behind */}
                <Link
                  href={`/${locale}/blog/${featured.slug}`}
                  className="group relative block h-[22rem] sm:h-[26rem] overflow-hidden rounded-lg bg-rmc-green-deep ring-1 ring-black/5 shadow-[0_24px_60px_-32px_rgba(13,61,36,0.55)]"
                >
                  {featured.image && (
                    <Image
                      src={featured.image}
                      alt={featured.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 800px"
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/0" />

                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                    {featured.category && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md bg-rmc-gold/20 border border-rmc-gold/40 px-2.5 py-1 text-[10px] font-semibold text-rmc-gold ${rtl ? 'font-arabic' : 'uppercase tracking-[0.16em]'}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold" />
                        {featured.category}
                      </span>
                    )}
                    <h3 className={`mt-3 max-w-2xl text-xl sm:text-2xl font-bold leading-tight text-white line-clamp-3 ${arFont}`}>
                      {featured.title}
                    </h3>
                    {featured.excerpt && (
                      <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-white/75 line-clamp-2 ${arFont}`}>
                        {featured.excerpt}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-5 text-xs">
                      <time dateTime={featured.date} className="inline-flex items-center gap-1.5 text-white/70">
                        <CalendarDays className="w-3.5 h-3.5 text-rmc-gold" />
                        {featured.dateLabel}
                      </time>
                      <span className={`inline-flex items-center gap-1.5 font-semibold text-white ${arFont}`}>
                        {t('readStory')}
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>

                {/* The next two — compact cards side by side */}
                {rest.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {rest.map((story) => (
                      <Link
                        key={story.slug}
                        href={`/${locale}/blog/${story.slug}`}
                        className="group flex gap-4 rounded-lg border border-gray-200/70 bg-white p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
                      >
                        <div className="relative w-28 sm:w-32 shrink-0 self-stretch min-h-[6rem] overflow-hidden rounded-md bg-gray-100">
                          {story.image && (
                            <Image
                              src={story.image}
                              alt=""
                              fill
                              sizes="128px"
                              className="object-cover object-center transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                            />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col py-0.5">
                          {story.category && (
                            <span className={`text-[10px] font-semibold text-rmc-gold truncate ${rtl ? 'font-arabic' : 'uppercase tracking-[0.16em]'}`}>
                              {story.category}
                            </span>
                          )}
                          <h4 className={`mt-1 text-sm font-semibold leading-snug text-gray-900 line-clamp-3 transition-colors group-hover:text-rmc-green ${arFont}`}>
                            {story.title}
                          </h4>
                          <time dateTime={story.date} className="mt-auto pt-2 inline-flex items-center gap-1.5 text-xs text-gray-400">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {story.dateLabel}
                          </time>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ════════ ANNOUNCEMENTS & TENDERS — side panel ════════ */}
          <div className="flex flex-col">
            <ColumnHeading
              icon={<Bell className="w-4 h-4 text-rmc-green" />}
              href={`/${locale}/announcements`}
              linkLabel={t('viewAll')}
              rtl={rtl}
            >
              {notices.editing ? (
                <InlineText
                  as="h3"
                  lang={locale}
                  value={pick(notices.content.title, locale)}
                  editValue={notices.content.title[lang]}
                  onCommit={(v) => notices.setField((d) => { d.title[lang] = v; })}
                  className={`text-base md:text-lg font-bold text-gray-900 leading-tight ${arFont}`}
                  dir={rtl ? 'rtl' : 'ltr'}
                  placeholder="Panel heading"
                />
              ) : (
                <h3 className={`text-base md:text-lg font-bold text-gray-900 leading-tight ${arFont}`}>
                  {pick(notices.content.title, locale)}
                </h3>
              )}
            </ColumnHeading>

            <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200/70 bg-white">
              {loading ? (
                <ul className="divide-y divide-gray-100" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex gap-4 px-5 py-4">
                      <div className="h-12 w-12 shrink-0 rounded-md bg-gray-100 animate-pulse" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-2.5 w-20 rounded bg-gray-100 animate-pulse" />
                        <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-rmc-green-light">
                    <Bell className="h-5 w-5 text-rmc-green/70" />
                  </span>
                  <p className={`mt-3 text-sm text-gray-500 ${arFont}`}>{t('noNotices')}</p>
                  <Link
                    href={`/${locale}/announcements`}
                    className={`mt-2 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors ${arFont}`}
                  >
                    {t('pastNotices')}
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const isTender = item.type === 'tender';
                    const published = new Date(item.publishAt);
                    const href = isTender
                      ? `/${locale}/tenders/${item.slug ?? item.id}`
                      : `/${locale}/announcements/${item.id}`;
                    return (
                      <li key={item.id}>
                        <Link href={href} className="group flex gap-4 px-5 py-4 transition-colors hover:bg-gray-50/80">
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50 group-hover:border-rmc-green/30 transition-colors">
                            <span className="text-base font-bold leading-none text-gray-900 tabular-nums">
                              {dayFmt.format(published)}
                            </span>
                            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider leading-none text-gray-400">
                              {monthFmt.format(published)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  isTender ? 'bg-rmc-gold/15 text-[#8A6A0F]' : 'bg-rmc-green-light text-rmc-green-dark'
                                } ${rtl ? 'font-arabic' : 'uppercase tracking-wider'}`}
                              >
                                {isTender ? t('tender') : t('announcement')}
                              </span>
                              {!isTender && item.priority === 'urgent' && (
                                <span className={`rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 ${rtl ? 'font-arabic' : 'uppercase tracking-wider'}`}>
                                  {t('urgent')}
                                </span>
                              )}
                            </div>
                            <h4 className={`mt-1.5 text-sm font-semibold leading-snug text-gray-900 line-clamp-2 transition-colors group-hover:text-rmc-green ${arFont}`}>
                              {resolveText(item.titleI18n, item.title, locale)}
                            </h4>
                            {isTender && (
                              <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${deadlineColor(item.expiresAt)}`}>
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                {deadlineLabel(item.expiresAt)}
                              </p>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Link
                href={`/${locale}/services/tender`}
                className={`mt-auto flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-xs font-semibold text-gray-600 transition-colors hover:text-rmc-green ${arFont}`}
              >
                {tt('empty.viewAll')}
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Icon + heading + "view all" row that tops each column. */
function ColumnHeading({
  icon,
  href,
  linkLabel,
  rtl,
  children,
}: {
  icon: React.ReactNode;
  href: string;
  linkLabel: string;
  rtl: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="w-9 h-9 shrink-0 rounded-xl bg-rmc-green-light flex items-center justify-center ring-1 ring-rmc-green/10">
          {icon}
        </span>
        {children}
      </div>
      <Link
        href={href}
        className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors ${rtl ? 'font-arabic' : ''}`}
      >
        {linkLabel}
        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}
