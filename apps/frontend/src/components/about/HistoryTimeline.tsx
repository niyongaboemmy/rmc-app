'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, Maximize2, Star, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const FILE_SERVER = process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';
const fileUrl = (key: string) => `${FILE_SERVER}/api/v1/files/${key}`;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

type HistoryEntry = {
  id: string;
  year: number;
  titleEn: string;
  titleRw: string;
  titleAr: string;
  descriptionEn: string;
  descriptionRw: string;
  descriptionAr: string;
  imageKey: string | null;
  sortOrder: number;
};

/* ---------------------------------------------------------------------------
   Localised section chrome. Entry content itself is fully dynamic / multilingual
   (managed in admin) — only the surrounding header labels live here.
--------------------------------------------------------------------------- */
const HEADER: Record<
  string,
  { kicker: string; title: string; accent: string; subtitle: string; readMore: string }
> = {
  en: {
    kicker: 'Our History',
    title: 'RMC Through the',
    accent: 'Years',
    subtitle:
      'A journey of faith, community and growth — from the first Muslims in Rwanda to the thriving community of today.',
    readMore: 'Read more',
  },
  rw: {
    kicker: 'Amateka Yacu',
    title: 'RMC Mu Myaka',
    accent: 'Yacu',
    subtitle:
      'Urugendo rw’ukwemera, umuryango n’iterambere — kuva ku Bayisilamu ba mbere mu Rwanda kugeza ku muryango uteye imbere w’ubu.',
    readMore: 'Soma byinshi',
  },
  ar: {
    kicker: 'تاريخنا',
    title: 'RMC عبر',
    accent: 'السنين',
    subtitle:
      'رحلة من الإيمان والمجتمع والنمو — من أوائل المسلمين في رواندا إلى مجتمع اليوم المزدهر.',
    readMore: 'اقرأ المزيد',
  },
};

function pickLocale(entry: HistoryEntry, locale: string) {
  if (locale === 'rw') {
    return {
      title: entry.titleRw || entry.titleEn,
      description: entry.descriptionRw || entry.descriptionEn,
    };
  }
  if (locale === 'ar') {
    return {
      title: entry.titleAr || entry.titleEn,
      description: entry.descriptionAr || entry.descriptionEn,
    };
  }
  return { title: entry.titleEn, description: entry.descriptionEn };
}

/* ---------------------------------------------------------------------------
   Year node — the focal "point" on the spine. Shows the FULL year.
--------------------------------------------------------------------------- */
function YearNode({ year, size = 'lg' }: { year: number; size?: 'lg' | 'sm' }) {
  const dims =
    size === 'lg'
      ? 'h-10 min-w-[3.5rem] px-3.5 text-[15px]'
      : 'h-8 min-w-[2.9rem] px-2.5 text-[12px]';
  return (
    <span className="relative inline-flex">
      {/* soft glow on hover */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-rmc-green/40 blur-md scale-150 opacity-0 transition-opacity duration-500 group-hover/entry:opacity-100"
      />
      <span
        className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark font-extrabold tabular-nums tracking-wide text-white shadow-lg shadow-rmc-green/30 ring-4 ring-white transition-transform duration-500 group-hover/entry:scale-105 ${dims}`}
      >
        {year}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   The milestone card — image-forward when an image exists, elegant
   watermark-year layout when it doesn't.
--------------------------------------------------------------------------- */
function MilestoneCard({
  entry,
  title,
  description,
  rtl,
  readMore,
  onOpen,
}: {
  entry: HistoryEntry;
  title: string;
  description: string;
  rtl: boolean;
  readMore: string;
  onOpen: (entry: HistoryEntry) => void;
}) {
  const hasImage = !!entry.imageKey;

  return (
    <article className="group/card relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_8px_30px_-14px_rgba(13,61,36,0.22)] transition-all duration-500 hover:-translate-y-1 hover:border-rmc-green/25 hover:shadow-[0_26px_55px_-22px_rgba(26,122,74,0.4)]">
      {/* gold accent bar */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-rmc-gold via-rmc-gold-light to-rmc-gold transition-transform duration-500 group-hover/card:scale-x-100"
      />

      {hasImage && (
        <button
          type="button"
          onClick={() => onOpen(entry)}
          className="group/img relative block h-52 w-full overflow-hidden"
          aria-label={`Open details for ${title}`}
        >
          <Image
            src={fileUrl(entry.imageKey!)}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover transition-transform duration-700 ease-out group-hover/img:scale-110"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep/75 via-rmc-green-deep/10 to-transparent"
          />
          {/* year ribbon on the image */}
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[12px] font-bold tabular-nums tracking-wide text-rmc-green-dark shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold" />
            {entry.year}
          </span>
          {/* zoom affordance */}
          <span className="absolute bottom-4 right-4 inline-flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-white/95 text-rmc-green-dark opacity-0 shadow-md transition-all duration-300 group-hover/img:translate-y-0 group-hover/img:opacity-100">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>
      )}

      <div className="relative p-6 md:p-7">
        {/* faint watermark year — anchors text-only cards */}
        {!hasImage && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-2 right-3 select-none text-[5.5rem] font-black leading-none tracking-tighter text-rmc-green/[0.06] tabular-nums"
          >
            {entry.year}
          </span>
        )}

        {!hasImage && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-rmc-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold" />
            <span className="tabular-nums">{entry.year}</span>
          </span>
        )}

        <h3
          className={`relative mt-2 text-lg font-bold text-gray-900 transition-colors duration-300 group-hover/card:text-rmc-green-dark md:text-xl ${
            rtl ? 'font-arabic' : ''
          }`}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {title}
        </h3>

        <span
          aria-hidden
          className="my-3.5 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green"
        />

        <p
          className={`relative text-sm leading-relaxed text-gray-500 line-clamp-4 ${rtl ? 'font-arabic' : ''}`}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {description}
        </p>

        <button
          type="button"
          onClick={() => onOpen(entry)}
          className="group/more relative mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-rmc-green transition-colors hover:text-rmc-green-dark"
        >
          {readMore}
          <ArrowRight
            className={`h-3.5 w-3.5 transition-transform duration-300 group-hover/more:translate-x-0.5 ${
              rtl ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
    </article>
  );
}

function TimelineEntry({
  entry,
  locale,
  index,
  onOpen,
}: {
  entry: HistoryEntry;
  locale: string;
  index: number;
  onOpen: (entry: HistoryEntry) => void;
}) {
  const { ref, visible } = useScrollReveal(0.12);
  const { title, description } = pickLocale(entry, locale);
  const isLeft = index % 2 === 0;
  const rtl = locale === 'ar';
  const readMore = (HEADER[locale] ?? HEADER.en).readMore;

  return (
    <div
      ref={ref}
      className={`group/entry relative pl-[4.75rem] transition-all duration-700 ease-out md:pl-0 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
      style={{ transitionDelay: `${(index % 2) * 90}ms` }}
    >
      {/* ---- Mobile node + connector (left rail) ---- */}
      <div className="absolute left-6 top-8 z-10 -translate-x-1/2 -translate-y-1/2 md:hidden">
        <YearNode year={entry.year} size="sm" />
      </div>
      <span
        aria-hidden
        className="absolute left-[2.85rem] top-8 h-px w-6 -translate-y-1/2 bg-gradient-to-r from-rmc-green/40 to-transparent md:hidden"
      />

      {/* ---- Desktop alternating row ---- */}
      <div className="md:flex md:items-center">
        {/* Card half */}
        <div
          className={`md:w-1/2 ${
            isLeft ? 'md:flex md:justify-end md:pr-16' : 'md:order-3 md:pl-16'
          }`}
        >
          <div className="w-full md:max-w-[26rem]">
            <MilestoneCard
              entry={entry}
              title={title}
              description={description}
              rtl={rtl}
              readMore={readMore}
              onOpen={onOpen}
            />
          </div>
        </div>

        {/* Center node + connector (desktop) */}
        <div className="relative hidden w-0 justify-center md:order-2 md:flex md:items-center">
          <span
            aria-hidden
            className={`absolute top-1/2 h-px w-10 -translate-y-1/2 ${
              isLeft
                ? 'right-1/2 bg-gradient-to-l from-rmc-green/45 to-transparent'
                : 'left-1/2 bg-gradient-to-r from-rmc-green/45 to-transparent'
            }`}
          />
          <YearNode year={entry.year} />
        </div>

        {/* Empty half */}
        <div className={`hidden md:block md:w-1/2 ${isLeft ? 'md:order-3' : 'md:order-1'}`} />
      </div>
    </div>
  );
}

/* Decorative cap that sits on the spine (centered on desktop, on the left rail
   on mobile) — used for the timeline's start marker. */
function SpineCap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex md:justify-center">
      <div className="ml-6 -translate-x-1/2 md:ml-0 md:translate-x-0">{children}</div>
    </div>
  );
}

function EntryModal({
  entry,
  locale,
  onClose,
}: {
  entry: HistoryEntry;
  locale: string;
  onClose: () => void;
}) {
  const { title, description } = pickLocale(entry, locale);
  const rtl = locale === 'ar';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-rmc-green-dark"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {entry.imageKey && (
          <div className="relative h-60 w-full shrink-0 overflow-hidden sm:h-72">
            <Image
              src={fileUrl(entry.imageKey)}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
            />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-7 md:p-8">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-rmc-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold" />
            <span className="tabular-nums">{entry.year}</span>
          </span>
          <h3
            className={`mt-2 text-2xl font-bold text-gray-900 ${rtl ? 'font-arabic' : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {title}
          </h3>
          <span
            aria-hidden
            className="my-4 block h-px w-14 rounded-full bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green"
          />
          <p
            className={`whitespace-pre-line text-[15px] leading-relaxed text-gray-600 ${rtl ? 'font-arabic' : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {description}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function HistoryTimeline({ locale }: { locale: string }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  const t = HEADER[locale] ?? HEADER.en;
  const rtl = locale === 'ar';

  useEffect(() => {
    fetch(`${API_BASE}/content/history/entries`)
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : json?.data ?? [];
        setEntries(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) return null;

  // Newest milestone first.
  const ordered = [...entries].reverse();

  return (
    <>
      <section className="relative overflow-hidden py-16 md:py-20">
        {/* subtle geometric backdrop */}
        <div aria-hidden className="pattern-light pointer-events-none absolute inset-0 opacity-70" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent"
        />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-16 text-center">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-rmc-green-dark">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
              {t.kicker}
            </div>
            <h2
              className={`text-3xl font-bold text-gray-900 md:text-4xl ${rtl ? 'font-arabic' : ''}`}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {t.title} <span className="text-rmc-green">{t.accent}</span>
            </h2>
            <div className="ornament-divider mx-auto my-4 max-w-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
            </div>
            <p
              className={`mx-auto max-w-2xl text-sm text-gray-500 md:text-base ${
                rtl ? 'font-arabic' : ''
              }`}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {t.subtitle}
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Spine — left rail on mobile, centered on desktop */}
            <div
              aria-hidden
              className="absolute bottom-0 left-6 top-0 w-[2px] bg-gradient-to-b from-transparent via-rmc-green/25 to-transparent md:left-1/2 md:-translate-x-1/2"
            />

            {/* Start cap */}
            <div className="mb-10 md:mb-12">
              <SpineCap>
                <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-rmc-gold/30 bg-white shadow-sm ring-4 ring-white">
                  <Star className="h-4 w-4 fill-rmc-gold text-rmc-gold" />
                </span>
              </SpineCap>
            </div>

            <div className="space-y-12 md:space-y-10">
              {ordered.map((entry, i) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  locale={locale}
                  index={i}
                  onOpen={setSelected}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {selected && (
        <EntryModal entry={selected} locale={locale} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
