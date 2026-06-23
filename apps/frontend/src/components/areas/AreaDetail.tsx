'use client';

import { useState } from 'react';
import { BookOpen, Heart, GraduationCap, Globe, X, ChevronLeft, ChevronRight, ZoomIn, type LucideIcon } from 'lucide-react';
import { pick, isRtl, type AreaItem } from '@/lib/content-api';
import { fileUrl } from '@/lib/api';

const ICONS: Record<string, LucideIcon> = { BookOpen, Heart, GraduationCap, Globe };

interface Props {
  item: AreaItem;
  locale: string;
  pillarIndex: number;
}

export function AreaDetail({ item, locale, pillarIndex }: Props) {
  const Icon = ICONS[item.icon] ?? Globe;
  const rtl = isRtl(locale);
  const arFont = locale === 'ar' ? 'font-arabic' : 'font-latin';
  const title = pick(item.title, locale);
  const description = pick(item.description, locale);
  const richContent = item.richContent ? pick(item.richContent, locale) : null;
  const gallery = item.galleryImages?.filter(Boolean) ?? [];

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + gallery.length) % gallery.length : null));
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % gallery.length : null));

  return (
    <>
      {/* ── Main article content ── */}
      <article dir={rtl ? 'rtl' : 'ltr'} className={arFont}>
        {/* Pillar badge + icon */}
        <div className="flex items-center gap-4 mb-6">
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30 shrink-0">
            <Icon className="w-7 h-7" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rmc-gold">
              Pillar {String(pillarIndex).padStart(2, '0')}
            </p>
            <h1 className={`text-xl md:text-2xl font-bold text-gray-900 leading-tight ${arFont}`}>{title}</h1>
          </div>
        </div>

        {/* Gold divider */}
        <span className="block h-1 w-14 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light mb-6" />

        {/* Description lead */}
        <p className={`text-sm md:text-base text-gray-600 leading-relaxed mb-8 ${arFont}`}>{description}</p>

        {/* Rich HTML content */}
        {richContent ? (
          <div
            className={`prose prose-green prose-sm max-w-none text-gray-700 leading-relaxed mb-10 ${arFont}`}
            dangerouslySetInnerHTML={{ __html: richContent }}
          />
        ) : (
          <div className="rounded-2xl border border-rmc-green/10 bg-rmc-green-light/30 p-6 text-sm text-rmc-green-dark/70 mb-10">
            Detailed content for this area is coming soon.
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px flex-1 bg-gradient-to-r from-rmc-gold/50 to-transparent" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-rmc-green-dark shrink-0">Photo Gallery</h2>
              <span className="h-px flex-1 bg-gradient-to-l from-rmc-gold/50 to-transparent" />
            </div>
            <div className={`grid gap-3 ${gallery.length === 1 ? 'grid-cols-1' : gallery.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {gallery.map((key, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(key)} alt={`${title} — photo ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxIndex(null)}>
          <button type="button" onClick={() => setLightboxIndex(null)} className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm z-10">
            <X className="w-5 h-5" />
          </button>
          {gallery.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm z-10">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm z-10">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(gallery[lightboxIndex])} alt={`${title} — photo ${lightboxIndex + 1}`} className="max-h-[88vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain select-none" onClick={(e) => e.stopPropagation()} />
          {gallery.length > 1 && (
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-xs font-medium tracking-wide">{lightboxIndex + 1} / {gallery.length}</p>
          )}
        </div>
      )}
    </>
  );
}
