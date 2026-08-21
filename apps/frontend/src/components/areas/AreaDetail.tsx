'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Heart, GraduationCap, Globe, X, ChevronLeft, ChevronRight, ZoomIn, type LucideIcon } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  AREAS_DEFAULT, ContentKeys, isRtl, pick, raw, tri,
  type AreaItem, type AreasContent, type Locale,
} from '@/lib/content-api';
import { fileUrl } from '@/lib/api';

/**
 * Loaded on demand — TipTap is large and only a super-admin in Edit Mode ever renders
 * it. `ssr: false` because it is browser-only. Same treatment as the Hajj description.
 */
const RichTextEditor = dynamic(
  () => import('@/components/ui/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false },
);

/** True when the HTML carries no actual words — an empty editor saves "<p></p>". */
function isBlank(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

const ICONS: Record<string, LucideIcon> = { BookOpen, Heart, GraduationCap, Globe };

interface Props {
  item: AreaItem;
  locale: string;
  pillarIndex: number;
  /**
   * `richContent` for the active locale, ALREADY SANITISED by the server page.
   *
   * Sanitising happens there because isomorphic-dompurify pulls in jsdom and is
   * server-only. While editing, the TipTap draft is rendered instead — unsanitised, but
   * it is the admin's own input in their own browser, and every public render comes back
   * through the server.
   */
  richHtml: string;
}

export function AreaDetail({ item, locale, pillarIndex, richHtml }: Props) {
  const { content, editing, setField } = useEditableContent<AreasContent>(
    ContentKeys.areas,
    AREAS_DEFAULT,
  );

  // Located by SLUG, not by the index the page happened to render at: the slug is this
  // page's identity, and an admin reordering the pillars in the dashboard would otherwise
  // make every edit here land on a different area.
  const idx = content.items.findIndex((a) => a.slug === item.slug);
  /** Live draft when the store carries this area, else the server-rendered row. */
  const live = idx >= 0 ? content.items[idx] : item;

  /** Guarded so an edit can never write to items[-1] and create a stray entry. */
  const editItem = (mutate: (draft: AreaItem) => void) => {
    if (idx < 0) return;
    setField((d) => { mutate(d.items[idx]); });
  };

  const lang = locale as Locale;
  const Icon = ICONS[live.icon] ?? Globe;
  const rtl = isRtl(locale);
  const dir = rtl ? ('rtl' as const) : ('ltr' as const);
  const arFont = locale === 'ar' ? 'font-arabic' : 'font-latin';
  const title = pick(live.title, locale);
  const description = pick(live.description, locale);
  const gallery = live.galleryImages?.filter(Boolean) ?? [];

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
            <InlineText
              as="h1"
              lang={locale}
              value={title}
              // editValue is this locale's OWN text, so an untranslated field opens empty
              // rather than pre-filled with the English it currently falls back to.
              editValue={raw(live.title, locale)}
              onCommit={(v) => editItem((a) => { a.title[lang] = v; })}
              dir={dir}
              placeholder="Area title"
              className={`text-xl md:text-2xl font-bold text-gray-900 leading-tight ${arFont}`}
            />
          </div>
        </div>

        {/* Gold divider */}
        <span className="block h-1 w-14 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light mb-6" />

        {/* Description lead */}
        <InlineText
          as="p"
          lang={locale}
          value={description}
          editValue={raw(live.description, locale)}
          onCommit={(v) => editItem((a) => { a.description[lang] = v; })}
          dir={dir}
          placeholder="Short description"
          className={`text-sm md:text-base text-gray-600 leading-relaxed mb-8 ${arFont}`}
        />

        {/* Rich HTML content. In Edit Mode the prose is replaced IN PLACE by the same
            TipTap editor the dashboard uses — the body becomes editable where it sits,
            formatting intact. InlineText cannot serve here: it edits plain text and would
            flatten every paragraph, link and bold run on the first keystroke. */}
        {editing ? (
          /* Keyed by language: the editor seeds its content once, so switching locale
             without a remount would leave the previous language in the box. */
          <div className="mb-10">
            <RichTextEditor
              key={lang}
              value={raw(live.richContent, locale)}
              onChange={(next) => editItem((a) => {
                // The field is optional in the shape, so an area that never had a body
                // needs the Tri created before a locale can be written into it.
                a.richContent = { ...(a.richContent ?? tri('')), [lang]: next };
              })}
              dir={dir}
              fontClassName={rtl ? 'font-arabic' : ''}
            />
          </div>
        ) : !isBlank(richHtml) ? (
          <div
            className={`prose prose-green prose-sm max-w-none text-gray-700 leading-relaxed mb-10 ${arFont}`}
            dangerouslySetInnerHTML={{ __html: richHtml }}
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
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
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
