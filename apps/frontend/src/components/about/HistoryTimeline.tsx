'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
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

function TimelineEntry({
  entry,
  locale,
  index,
  onImageClick,
}: {
  entry: HistoryEntry;
  locale: string;
  index: number;
  onImageClick: (key: string, title: string) => void;
}) {
  const { ref, visible } = useScrollReveal(0.1);
  const { title, description } = pickLocale(entry, locale);
  const isLeft = index % 2 === 0;
  const rtl = locale === 'ar';

  return (
    <div
      ref={ref}
      className={`relative flex flex-col md:flex-row gap-8 md:gap-0 items-start md:items-center transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Left content (desktop even, always mobile) */}
      <div className={`md:w-1/2 ${isLeft ? 'md:pr-12 md:text-right' : 'md:order-3 md:pl-12'}`}>
        <div
          className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow ${
            isLeft ? 'md:ml-auto' : ''
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rmc-gold mb-1">
            {entry.year}
          </p>
          <h3 className={`text-lg font-bold text-gray-900 mb-2 ${rtl ? 'font-arabic' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
            {title}
          </h3>
          <p className={`text-sm text-gray-500 leading-relaxed ${rtl ? 'font-arabic' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
            {description}
          </p>
          {entry.imageKey && (
            <button
              onClick={() => onImageClick(entry.imageKey!, title)}
              className="mt-4 block w-full overflow-hidden rounded-xl group"
              aria-label={`View image for ${title}`}
            >
              <Image
                src={fileUrl(entry.imageKey)}
                alt={title}
                width={400}
                height={200}
                className="w-full h-36 object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
              />
            </button>
          )}
        </div>
      </div>

      {/* Center spine dot (desktop) */}
      <div className="hidden md:flex md:order-2 md:w-0 md:justify-center md:items-center relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark flex items-center justify-center text-white text-xs font-bold shadow-md shadow-rmc-green/30 z-10 ring-4 ring-white">
          {entry.year.toString().slice(2)}
        </div>
      </div>

      {/* Right spacer (desktop even entries) */}
      {isLeft && <div className="hidden md:block md:order-3 md:w-1/2" />}
      {!isLeft && <div className="hidden md:block md:order-1 md:w-1/2" />}

      {/* Mobile year badge */}
      <div className="md:hidden flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-rmc-green flex items-center justify-center text-white text-xs font-bold shrink-0">
          {entry.year.toString().slice(2)}
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-rmc-gold">{entry.year}</span>
      </div>
    </div>
  );
}

function ImageModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-rmc-gold transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        <Image
          src={src}
          alt={alt}
          width={900}
          height={600}
          className="w-full h-auto rounded-2xl shadow-2xl"
        />
        <p className="mt-3 text-center text-white/70 text-sm">{alt}</p>
      </div>
    </div>
  );
}

export function HistoryTimeline({ locale }: { locale: string }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ src: string; alt: string } | null>(null);

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
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <>
      <section className="relative py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2.5 mb-6 px-4 py-1.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 text-[11px] font-semibold uppercase tracking-[0.18em] text-rmc-green-dark">
              <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
              Our History
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              RMC Through the <span className="text-rmc-green">Years</span>
            </h2>
            <div className="ornament-divider max-w-xs mx-auto my-4">
              <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
            </div>
          </div>

          {/* Desktop: center vertical line */}
          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-rmc-green/20 to-transparent -translate-x-1/2" />

            <div className="space-y-12 md:space-y-16">
              {entries.map((entry, i) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  locale={locale}
                  index={i}
                  onImageClick={(key, title) => setModal({ src: fileUrl(key), alt: title })}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {modal && (
        <ImageModal src={modal.src} alt={modal.alt} onClose={() => setModal(null)} />
      )}
    </>
  );
}
