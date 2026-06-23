'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { fileUrl } from '@/lib/api';

interface Props {
  images: string[];
  title: string;
}

export function AreaGallery({ images, title }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images.length) return null;

  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));

  return (
    <>
      <section>
        {/* Section heading */}
        <div className="flex items-center gap-4 mb-6">
          <span className="h-px flex-1 bg-gradient-to-r from-rmc-gold/50 to-transparent" />
          <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-rmc-green-dark shrink-0">Photo Gallery</h2>
          <span className="h-px flex-1 bg-gradient-to-l from-rmc-gold/50 to-transparent" />
        </div>

        {/* Grid */}
        <div className={`grid gap-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {images.map((key, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl(key)}
                alt={`${title} — photo ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center">
                <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity duration-200" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl(images[lightboxIndex])}
            alt={`${title} — photo ${lightboxIndex + 1}`}
            className="max-h-[88vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-xs font-medium tracking-wide">
              {lightboxIndex + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </>
  );
}
