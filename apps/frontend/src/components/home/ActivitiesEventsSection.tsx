'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Newspaper,
  Bell,
  BellRing,
  Images,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
   Cohesive, on-brand badge family.
   Lean green / gold / neutral — no rainbow; every category reads
   as one system. (rmc-gold-dark isn't a token, so gold text uses a
   token-free value inline.)
   ────────────────────────────────────────────────────────────── */
type BadgeTone = 'green' | 'gold' | 'neutral';

const BADGE_STYLES: Record<BadgeTone, string> = {
  green: 'bg-rmc-green-light text-rmc-green-dark ring-rmc-green/15',
  gold: 'bg-rmc-gold/10 text-[#8A6A0F] ring-rmc-gold/25',
  neutral: 'bg-gray-100 text-gray-600 ring-gray-200',
};

function badgeClass(tone: BadgeTone) {
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset ${BADGE_STYLES[tone]}`;
}

/* Full-resolution Unsplash URL for the gallery viewer */
const hi = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1280&auto=format&fit=crop`;
const IMG_EDU = 'photo-1541339907198-e08756dedf3f';
const IMG_AID = 'photo-1532629345422-7515f3d16bb6';
const IMG_CONF = 'photo-1521791136064-7986c2920216';

interface Activity {
  id: string;
  category: string;
  tone: BadgeTone;
  title: string;
  excerpt: string;
  date: string; // human-readable, e.g. "June 4, 2026"
  image: string; // small thumbnail for the row
  gallery: string[]; // full-size images shown in the lightbox
}

interface RmcEvent {
  id: string;
  title: string;
  date: string; // ISO "YYYY-MM-DD" — drives the tile, ordering and countdown
  time: string;
  location: string;
  type: string;
  tone: BadgeTone;
}

/* ──────────────────────────────────────────────────────────────
   DATA — coherent for TODAY = 12 June 2026
   LATEST   → recent past (mid-Apr → early-Jun 2026)
   UPCOMING → future, chronological (20 Jun → Nov 2026)
   ────────────────────────────────────────────────────────────── */
const ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    category: 'Education',
    tone: 'green',
    title: 'RMC Launches Digital Madrassa Across All Provinces',
    excerpt:
      'A new online platform for Islamic education is now live nationwide, bringing structured Qur’an and Arabic lessons to over 2,000 children in its first month.',
    date: 'June 4, 2026',
    image:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=200&auto=format&fit=crop',
    gallery: [hi(IMG_EDU), hi(IMG_CONF), hi(IMG_AID)],
  },
  {
    id: 'a2',
    category: 'Community',
    tone: 'gold',
    title: 'Ramadan Food Distribution Reaches 5,000 Families',
    excerpt:
      'In partnership with local NGOs, RMC delivered food packages to 5,000 vulnerable families across Rwanda throughout the blessed month of Ramadan.',
    date: 'May 12, 2026',
    image:
      'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=200&auto=format&fit=crop',
    gallery: [hi(IMG_AID), hi(IMG_EDU), hi(IMG_CONF)],
  },
  {
    id: 'a3',
    category: 'Leadership',
    tone: 'neutral',
    title: 'Annual Imam Training Conference Held in Musanze',
    excerpt:
      '120 imams from across Rwanda gathered for a three-day programme on community leadership, digital outreach, and pastoral care.',
    date: 'April 18, 2026',
    image:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=200&auto=format&fit=crop',
    gallery: [hi(IMG_CONF), hi(IMG_AID), hi(IMG_EDU)],
  },
];

const EVENTS: RmcEvent[] = [
  {
    id: 'e1',
    title: 'Eid al-Adha National Celebration',
    date: '2026-06-20',
    time: '08:00 AM',
    location: 'Amahoro National Stadium, Kigali',
    type: 'Religious',
    tone: 'green',
  },
  {
    id: 'e2',
    title: 'RMC Annual Scholarship Awards Ceremony',
    date: '2026-07-11',
    time: '10:00 AM',
    location: 'Kigali Convention Centre',
    type: 'Education',
    tone: 'green',
  },
  {
    id: 'e3',
    title: 'Muslim Women Leadership Summit',
    date: '2026-08-08',
    time: '09:00 AM',
    location: 'Serena Hotel, Kigali',
    type: 'Community',
    tone: 'gold',
  },
  {
    id: 'e4',
    title: 'Qur’an Recitation Competition — National Finals',
    date: '2026-09-26',
    time: '02:00 PM',
    location: 'Grand Mosque of Kigali',
    type: 'Da’wah',
    tone: 'gold',
  },
  {
    id: 'e5',
    title: 'RMC General Assembly Meeting',
    date: '2026-11-14',
    time: '09:00 AM',
    location: 'RMC Headquarters, Rebero',
    type: 'Governance',
    tone: 'neutral',
  },
];

/* ── Date helpers (parsed from ISO; TODAY is 12 June 2026) ── */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d, dateObj: new Date(y, m - 1, d) };
}

function formatLong(iso: string) {
  return parseISO(iso).dateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Friendly "how soon" label, measured from today (12 Jun 2026). */
function countdownLabel(iso: string) {
  const today = new Date(2026, 5, 12);
  const days = Math.round((parseISO(iso).dateObj.getTime() - today.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'Next week';
  if (days < 56) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

/* ──────────────────────────────────────────────────────────────
   Gallery lightbox — opens from a Latest Activity, shows the image
   plus a thumbnail gallery. Keyboard (Esc / ← / →), backdrop click,
   and body-scroll-lock included.
   ────────────────────────────────────────────────────────────── */
function GalleryModal({
  activity,
  index,
  locale,
  onIndex,
  onClose,
}: {
  activity: Activity;
  index: number;
  locale: string;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const images = activity.gallery;
  const total = images.length;
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Keep the latest values for the once-subscribed key handler */
  const indexRef = useRef(index);
  indexRef.current = index;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;

  /* Keyboard nav — subscribe once (no focus stealing on navigation) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      else if (e.key === 'ArrowRight') onIndexRef.current((indexRef.current + 1) % total);
      else if (e.key === 'ArrowLeft') onIndexRef.current((indexRef.current - 1 + total) % total);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [total]);

  /* Lock background scroll WITHOUT shifting the page, and focus the close
     button WITHOUT scrolling — so the gallery opens right where you are. */
  useEffect(() => {
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, []);

  const go = (delta: number) => onIndex((index + delta + total) % total);

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${activity.title} — photo gallery`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-fade-in"
    >
      {/* Backdrop — click to dismiss */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog — capped to the viewport so it always fits the screen */}
      <div className="relative w-full max-w-3xl max-h-[92dvh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/10">
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close gallery"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image — full picture, letterboxed on green-deep, height-capped */}
        <div className="relative shrink-0 flex items-center justify-center bg-rmc-green-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index]}
            alt={`${activity.title} — image ${index + 1} of ${total}`}
            className="w-full max-h-[58vh] object-contain"
          />

          {total > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/65 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[11px] font-semibold tabular-nums backdrop-blur-sm">
                {index + 1} / {total}
              </div>
            </>
          )}
        </div>

        {/* Caption + thumbnails — scrolls only if the screen is very short */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={badgeClass(activity.tone)}>{activity.category}</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Calendar className="w-3 h-3 shrink-0" />
              {activity.date}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 leading-snug mb-1.5">{activity.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{activity.excerpt}</p>

          {total > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => onIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === index}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 ring-2 transition-all outline-none focus-visible:ring-rmc-green ${
                    i === index ? 'ring-rmc-green' : 'ring-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Footer — photo count + read-more CTA */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
              <Images className="w-3.5 h-3.5 shrink-0" />
              {total} {total === 1 ? 'photo' : 'photos'}
            </span>
            <Link
              href={`/${locale}/blog`}
              className="group inline-flex items-center gap-1.5 px-4 py-2 shrink-0 bg-rmc-green text-white text-xs font-bold rounded-full shadow-md shadow-rmc-green/25 hover:bg-rmc-green-dark hover:shadow-rmc-green/40 motion-safe:hover:scale-105 transition-all duration-300"
            >
              Read full story
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}

export function ActivitiesEventsSection() {
  const { locale } = useParams<{ locale: string }>();
  const [openId, setOpenId] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const [featured, ...rest] = EVENTS;
  const fDate = parseISO(featured.date);

  const activeActivity = openId ? ACTIVITIES.find((a) => a.id === openId) ?? null : null;

  const openGallery = (id: string) => {
    setImgIndex(0);
    setOpenId(id);
  };

  return (
    <section className="relative bg-transparent py-20 md:py-28 overflow-hidden">
      {/* Faint geometric texture + single gold hairline at the top */}
      <div className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="max-w-2xl mx-auto text-center mb-14 animate-fade-up">
          <div className="inline-flex items-center gap-2.5 mb-5 px-4 py-1.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 backdrop-blur-sm text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-rmc-green-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
            Activities &amp; Events
          </div>

          <h2 className="text-3xl md:text-[2.6rem] font-bold text-gray-900 tracking-tight leading-[1.15]">
            Latest &amp; Upcoming
          </h2>

          {/* Gold ornament flourish with a small Arabic touch */}
          <div className="ornament-divider max-w-xs mx-auto mt-4 mb-4">
            <p className="font-arabic text-rmc-green-dark text-base md:text-lg leading-loose px-2" dir="rtl">
              بِسْمِ اللَّهِ
            </p>
          </div>

          <p className="text-gray-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Follow RMC&apos;s most recent activities and mark your calendar for the
            community events ahead.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* ════════ LATEST ACTIVITIES — left, wider (3 cols) ════════ */}
          <div className="lg:col-span-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-rmc-green-light flex items-center justify-center ring-1 ring-rmc-green/10">
                  <Newspaper className="w-4 h-4 text-rmc-green" />
                </span>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-gray-900 leading-none">
                    Latest Activities
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1">Tap a story to view its gallery</p>
                </div>
              </div>
              <Link
                href={`/${locale}/blog`}
                className="group inline-flex items-center gap-1 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors shrink-0"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* News rows joined by hairlines — each opens an image gallery */}
            <div className="rounded-2xl border border-gray-100 ring-1 ring-black/5 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
              {ACTIVITIES.map((activity, i) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => openGallery(activity.id)}
                  aria-label={`Open photo gallery: ${activity.title}`}
                  className="group w-full text-left flex gap-4 p-4 sm:p-5 hover:bg-rmc-green-light/30 outline-none focus-visible:bg-rmc-green-light/40 transition-colors duration-300 animate-fade-up"
                  style={{ animationDelay: `${i * 90 + 220}ms` }}
                >
                  {/* Thumbnail with gallery affordance */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activity.image}
                      alt={activity.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                    />
                    {/* Hover overlay — signals it opens a gallery */}
                    <div className="absolute inset-0 flex items-center justify-center bg-rmc-green-deep/0 group-hover:bg-rmc-green-deep/35 transition-colors duration-300">
                      <span className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                        <Images className="w-3.5 h-3.5 text-rmc-green" />
                      </span>
                    </div>
                    {/* Photo count badge */}
                    <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[9px] font-bold backdrop-blur-sm">
                      <Images className="w-2.5 h-2.5" />
                      {activity.gallery.length}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={badgeClass(activity.tone)}>{activity.category}</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {activity.date}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-[15px] font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-rmc-green transition-colors duration-200">
                      {activity.title}
                    </h4>
                    <p className="text-xs sm:text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                      {activity.excerpt}
                    </p>
                  </div>

                  <Images className="hidden sm:block w-4 h-4 text-gray-300 shrink-0 self-center transition-colors duration-300 group-hover:text-rmc-green" />
                </button>
              ))}
            </div>
          </div>

          {/* ════════ UPCOMING EVENTS — right (2 cols) ════════ */}
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '220ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-rmc-gold/10 flex items-center justify-center ring-1 ring-rmc-gold/20">
                  <Calendar className="w-4 h-4 text-rmc-gold" />
                </span>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-gray-900 leading-none">
                    Upcoming Events
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1">Save the date</p>
                </div>
              </div>
              <Link
                href={`/${locale}/contact`}
                className="group inline-flex items-center gap-1 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors shrink-0"
              >
                All events
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Featured — the soonest event, elevated */}
            <Link
              href={`/${locale}/contact`}
              className="group relative block rounded-2xl bg-rmc-green-deep text-white p-5 ring-1 ring-white/10 shadow-sm overflow-hidden motion-safe:hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 animate-fade-up"
              style={{ animationDelay: '320ms' }}
            >
              <div className="absolute inset-0 pattern-islamic opacity-10 pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent pointer-events-none" />

              <div className="relative flex items-start gap-4">
                {/* Gold day-tile on green-deep */}
                <div className="w-16 shrink-0 text-center rounded-xl bg-white/10 ring-1 ring-white/15 py-2.5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 leading-none">
                    {MONTHS[fDate.m]}
                  </p>
                  <p className="text-3xl font-bold leading-tight text-rmc-gold-light tabular-nums">
                    {fDate.d}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rmc-gold-light">
                      <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                      Next up
                    </span>
                    <span className="text-[11px] font-semibold text-white/60">
                      {countdownLabel(featured.date)}
                    </span>
                  </div>

                  <h4 className="text-[15px] sm:text-base font-bold leading-snug mb-2 line-clamp-2">
                    {featured.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/70">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-rmc-gold-light shrink-0" />
                      {formatLong(featured.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rmc-gold-light shrink-0" />
                      {featured.time}
                    </span>
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-rmc-gold-light shrink-0" />
                      <span className="truncate">{featured.location.split(',')[0]}</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Remaining events */}
            <div className="mt-3 space-y-3">
              {rest.map((event, i) => {
                const d = parseISO(event.date);
                return (
                  <Link
                    key={event.id}
                    href={`/${locale}/contact`}
                    className="group flex items-start gap-3 p-4 rounded-2xl border border-gray-100 ring-1 ring-black/5 bg-white shadow-sm hover:border-rmc-green/30 hover:shadow-md motion-safe:hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${i * 80 + 380}ms` }}
                  >
                    {/* Date tile — gold day on green-deep, flips to solid green on hover */}
                    <div className="w-12 shrink-0 text-center rounded-xl bg-rmc-green-deep py-2 group-hover:bg-rmc-green transition-colors duration-300">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 leading-none">
                        {MONTHS[d.m]}
                      </p>
                      <p className="text-xl font-bold leading-tight text-rmc-gold-light tabular-nums">
                        {d.d}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={badgeClass(event.tone)}>{event.type}</span>
                      <h4 className="mt-1.5 text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-rmc-green transition-colors duration-200">
                        {event.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3 shrink-0" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.location.split(',')[0]}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Subscribe CTA — matches the home-page system */}
            <div
              className="mt-4 flex items-center gap-4 p-4 rounded-2xl border border-rmc-green/15 bg-rmc-green-light/50 animate-fade-up"
              style={{ animationDelay: '620ms' }}
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white flex items-center justify-center ring-1 ring-rmc-green/15 shadow-sm">
                <Bell className="w-4 h-4 text-rmc-green" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-tight">Never miss an event</p>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                  Get notified about upcoming RMC events near you.
                </p>
              </div>
              <Link
                href={`/${locale}/contact`}
                className="group inline-flex items-center gap-1.5 px-4 py-2 shrink-0 bg-rmc-green text-white text-xs font-bold rounded-full shadow-md shadow-rmc-green/25 hover:bg-rmc-green-dark hover:shadow-rmc-green/40 motion-safe:hover:scale-105 transition-all duration-300"
              >
                <BellRing className="w-3.5 h-3.5 shrink-0" />
                Subscribe
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Image gallery lightbox */}
      {activeActivity && (
        <GalleryModal
          activity={activeActivity}
          index={imgIndex}
          locale={locale}
          onIndex={setImgIndex}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}
