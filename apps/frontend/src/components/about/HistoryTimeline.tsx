'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ArrowRight } from 'lucide-react';
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
   Year badge — a solid rounded-rectangle tag in the left column. Minimal, no
   glow or ring: the whole timeline reads as a clean list, not a set of cards.
--------------------------------------------------------------------------- */
function YearBadge({ year }: { year: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-md bg-rmc-green-deep px-2.5 py-1.5 text-[13px] font-bold tabular-nums tracking-wide text-white">
      {year}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   One milestone — a minimal row: year badge in the left column, title and
   description in the right, with the vertical rail as the content column's
   leading border. No card, no shadow, no image inline. Logical props (ms-/ps-/
   start-/border-s) so the whole rail mirrors to the right under Arabic.

   `Read more` (opening the modal with the full text and any image) shows only
   when there is more to see — an image, or a description too long to sit inline.
--------------------------------------------------------------------------- */
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
  const rtl = locale === 'ar';
  const readMore = (HEADER[locale] ?? HEADER.en).readMore;
  const hasMore = !!entry.imageKey || description.length > 180;

  return (
    <div
      ref={ref}
      className={`group/entry flex gap-4 transition-all duration-700 ease-out sm:gap-5 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {/* Year column */}
      <div className="shrink-0 pt-4 sm:pt-5">
        <YearBadge year={entry.year} />
      </div>

      {/* Content in a bordered card with a soft background — each entry reads as a
          self-contained block. The year badge stays outside on the leading edge. */}
      <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-all duration-300 hover:border-rmc-green/30 hover:bg-white hover:shadow-md sm:p-5">
        <h3
          className={`text-base font-bold leading-snug text-rmc-green-deep transition-colors group-hover/entry:text-rmc-green md:text-lg ${
            rtl ? 'font-arabic' : ''
          }`}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {title}
        </h3>
        <p
          className={`mt-1.5 text-sm leading-relaxed text-gray-500 line-clamp-3 ${rtl ? 'font-arabic' : ''}`}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {description}
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={() => onOpen(entry)}
            className="group/more mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-rmc-green transition-colors hover:text-rmc-green-dark"
          >
            {readMore}
            <ArrowRight
              className={`h-3.5 w-3.5 transition-transform duration-300 group-hover/more:translate-x-0.5 ${
                rtl ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>
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
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl animate-modal-in"
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

  // Oldest milestone first — the natural reading for a history section, from the
  // founding forward. Sort by year, then sortOrder, rather than trusting fetch order.
  const ordered = [...entries].sort((a, b) => a.year - b.year || a.sortOrder - b.sortOrder);

  return (
    <>
      <section className="relative overflow-hidden py-12 md:py-14">
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
          {/* Section header — plain heading, no eyebrow or ornament */}
          <div className="mb-8 text-center">
            <h2
              className={`text-3xl font-medium text-gray-900 md:text-4xl ${rtl ? 'font-arabic' : ''}`}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {t.title} {t.accent}
            </h2>
            <p
              className={`mx-auto mt-4 max-w-xl text-sm text-gray-500 md:text-base ${
                rtl ? 'font-arabic' : ''
              }`}
              dir={rtl ? 'rtl' : 'ltr'}
            >
              {t.subtitle}
            </p>
          </div>

          {/* Timeline — a single clean column. The vertical rail is each entry's
              content-column border (see TimelineEntry), so no separate spine. */}
          <div className="mx-auto max-w-3xl space-y-4">
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
      </section>

      {selected && (
        <EntryModal entry={selected} locale={locale} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
