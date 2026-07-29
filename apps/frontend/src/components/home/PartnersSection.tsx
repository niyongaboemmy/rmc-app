'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ExternalLink, X } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { assetUrl } from '@/lib/api';
import {
  ContentKeys,
  PARTNERS_DEFAULT,
  pick,
  isRtl,
  tri,
  type PartnersContent,
  type PartnerItem,
  type Locale,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { InlineImage } from '@/components/edit-mode/InlineImage';
import { InlineLink } from '@/components/edit-mode/InlineLink';
import { AddCardTile } from '@/components/edit-mode/AddCardTile';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';

interface PartnerCardEditHandlers {
  onLogo: (key: string) => void;
  onName: (value: string) => void;
  onSector: (value: string) => void;
  onDescription: (value: string) => void;
  onWebsite: (value: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function PartnerCard({
  partner,
  sector,
  description,
  delay,
  visible,
  editing,
  locale,
  index,
  count,
  onOpen,
  handlers,
}: {
  partner: PartnerItem;
  sector: string;
  description: string;
  delay: number;
  visible: boolean;
  editing: boolean;
  locale: string;
  index: number;
  count: number;
  onOpen: () => void;
  handlers: PartnerCardEditHandlers;
}) {
  const linked = Boolean(partner.website);

  const cardClass = `group relative flex h-full flex-col items-center rounded-lg border border-gray-200/70 bg-white px-6 py-8 transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none hover:-translate-y-2 hover:border-rmc-green/30 hover:shadow-[0_12px_28px_-16px_rgba(26,122,74,0.2)] ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
  }`;

  // ── Edit mode: a non-navigating card whose every field is editable in place ──
  if (editing) {
    return (
      <div
        className="relative flex h-full flex-col items-center rounded-lg border border-dashed border-rmc-green/40 bg-white px-6 py-8"
        style={{ transitionDelay: `${delay}ms` }}
      >
        <CardEditToolbar
          canMoveUp={index > 0}
          canMoveDown={index < count - 1}
          onMoveUp={handlers.onMoveUp}
          onMoveDown={handlers.onMoveDown}
          onDelete={handlers.onDelete}
        />

        {/* Logo — click to replace/upload */}
        <div className="relative h-20 w-full md:h-24">
          <InlineImage
            value={partner.logo}
            onChange={handlers.onLogo}
            folder="partners"
            alt={`${partner.name} logo`}
            className="mx-auto h-full w-40"
            imgClassName="object-contain p-1"
          />
        </div>

        {/* Name (not translated) */}
        <InlineText
          as="p"
          value={partner.name}
          onCommit={handlers.onName}
          className="mt-6 text-center text-sm font-bold uppercase tracking-wide text-gray-900"
          placeholder="Partner name"
        />

        {/* Sector (per-language) */}
        <InlineText
          as="p"
          lang={locale}
          value={sector}
          onCommit={handlers.onSector}
          className="mt-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-gold"
          placeholder="Sector"
        />

        {/* Description (per-language) — shown in the partner modal */}
        <InlineText
          as="p"
          lang={locale}
          value={description}
          onCommit={handlers.onDescription}
          className="mt-3 text-center text-xs leading-relaxed text-gray-500"
          placeholder="Short description"
        />

        {/* Website target */}
        <div className="mt-4">
          <InlineLink value={partner.website ?? ''} onChange={handlers.onWebsite} />
        </div>
      </div>
    );
  }

  const content = (
    <>
      {/* External-link hint — only for partners with a website */}
      {linked && (
        <span
          aria-hidden
          className="absolute right-3.5 top-3.5 grid place-items-center w-6 h-6 rounded-full bg-rmc-green/10 text-rmc-green opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
        >
          <ExternalLink className="w-3 h-3" />
        </span>
      )}

      {/* Logo — fixed box so every partner aligns regardless of aspect ratio.
          Guard the empty case: next/image throws on an empty src (can happen for
          a partner added but not yet given a logo before publish). */}
      <div className="relative flex h-20 w-full items-center justify-center md:h-24">
        {partner.logo ? (
          <Image
            src={assetUrl(partner.logo)}
            alt={`${partner.name} logo`}
            fill
            sizes="(max-width: 640px) 40vw, 220px"
            className="object-contain p-1 transition-transform duration-500 motion-reduce:transform-none group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full rounded-md bg-gray-50" aria-hidden />
        )}
      </div>

      {/* Name */}
      <p className="mt-6 text-sm font-bold uppercase tracking-wide text-gray-900 transition-colors duration-200 group-hover:text-rmc-green">
        {partner.name}
      </p>

      {/* Sector */}
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-gold">
        {sector}
      </p>
    </>
  );

  const ring =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  // Clicking any partner opens its detail modal (short note + optional website).
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`About ${partner.name}`}
      className={`${cardClass} ${ring} text-center`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {content}
    </button>
  );
}

/* Partner detail modal — the short descriptive note + a link out to the
   partner's website when there is one. */
function PartnerModal({
  partner,
  sector,
  description,
  locale,
  onClose,
}: {
  partner: PartnerItem;
  sector: string;
  description: string;
  locale: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!mounted) return null;

  const rtl = isRtl(locale);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="h-1.5 bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-7 text-center">
          <div className="mx-auto flex h-20 w-40 items-center justify-center">
            {partner.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(partner.logo)} alt={`${partner.name} logo`} className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full rounded-md bg-gray-50" aria-hidden />
            )}
          </div>

          <h3 className="mt-5 text-lg font-bold uppercase tracking-wide text-gray-900">{partner.name}</h3>
          {sector && (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-gold">{sector}</p>
          )}

          {description ? (
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{description}</p>
          ) : (
            <p className="mt-4 text-sm italic text-gray-400">No description yet.</p>
          )}

          {partner.website && (
            <a
              href={partner.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
            >
              <ExternalLink className="h-4 w-4" /> Visit website
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PartnersSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);
  const { ref: gridRef, visible: gridVisible } = useScrollReveal(0.05);

  // Content managed from Admin → Content → Our Partners. Falls back to the
  // built-in defaults until something is saved. In super-admin Edit Mode the
  // section reflects in-progress edits live (see `useEditableContent`); on the
  // public site this behaves exactly like a fetch-once-then-merge-over-defaults.
  const { content, editing, setField } = useEditableContent<PartnersContent>(
    ContentKeys.partners,
    PARTNERS_DEFAULT,
  );
  const { bumpSeed } = useEditMode();
  const lang = locale as Locale;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const addPartner = () =>
    setField((d) => {
      d.items.push({ name: '', sector: tri(''), description: tri(''), logo: '', website: '' });
    });

  const deletePartner = (i: number) => {
    setField((d) => { d.items.splice(i, 1); });
    bumpSeed(); // re-seed remaining index-keyed editables to their new positions
  };

  const movePartner = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    setField((d) => { [d.items[i], d.items[j]] = [d.items[j], d.items[i]]; });
    bumpSeed();
  };

  const rtl = isRtl(locale);
  const fontClass = rtl ? 'font-arabic' : '';
  const dir = rtl ? 'rtl' : 'ltr';

  const title = pick(content.title, locale);
  const lede = pick(content.lede, locale);
  const footerNote = pick(content.footerNote, locale);

  return (
    <section className="relative overflow-hidden bg-transparent py-12 md:py-16">
      {/* Light Islamic geometry + symmetric gold hairline seams */}
      <div aria-hidden className="absolute inset-0 pattern-light opacity-50" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />

      {/* Airy brand glow anchors */}
      <div aria-hidden className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-rmc-green-light/50 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-rmc-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={titleRef}
          className={`mx-auto mb-14 max-w-2xl text-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <h2
            dir={dir}
            className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${fontClass}`}
          >
            {editing ? (
              <InlineText
                as="span"
                lang={locale}
                value={title}
                onCommit={(v) => setField((d) => { d.title[lang] = v; })}
                className="text-rmc-green"
                dir={dir}
                placeholder="Section title"
              />
            ) : (
              <span className="text-rmc-green">{title}</span>
            )}
          </h2>

          <div className="ornament-divider mx-auto my-4 max-w-xs" aria-hidden>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
          </div>

          {editing ? (
            <InlineText
              as="p"
              lang={locale}
              value={lede}
              onCommit={(v) => setField((d) => { d.lede[lang] = v; })}
              dir={dir}
              className={`mx-auto max-w-xl text-sm leading-relaxed text-gray-500 md:text-base ${fontClass}`}
              placeholder="Section lede"
            />
          ) : (
            <p
              dir={dir}
              className={`mx-auto max-w-xl text-sm leading-relaxed text-gray-500 md:text-base ${fontClass}`}
            >
              {lede}
            </p>
          )}
        </div>

        {/* Partner logo wall */}
        <div ref={gridRef} className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
          {content.items.map((partner, i) => (
            <PartnerCard
              key={i}
              partner={partner}
              sector={pick(partner.sector, locale)}
              description={pick(partner.description, locale)}
              delay={i * 90}
              visible={gridVisible}
              editing={editing}
              locale={locale}
              index={i}
              count={content.items.length}
              onOpen={() => setOpenIndex(i)}
              handlers={{
                onLogo: (key) => setField((d) => { d.items[i].logo = key; }),
                onName: (v) => setField((d) => { d.items[i].name = v; }),
                onSector: (v) => setField((d) => { d.items[i].sector[lang] = v; }),
                onDescription: (v) => setField((d) => {
                  if (!d.items[i].description) d.items[i].description = tri('');
                  d.items[i].description![lang] = v;
                }),
                onWebsite: (v) => setField((d) => { d.items[i].website = v; }),
                onDelete: () => deletePartner(i),
                onMoveUp: () => movePartner(i, -1),
                onMoveDown: () => movePartner(i, 1),
              }}
            />
          ))}
          {editing && <AddCardTile label="Add partner" onClick={addPartner} />}
        </div>

        {/* Footer note */}
        {editing ? (
          <div className="mt-12 text-center">
            <p dir={dir} className={`text-sm text-gray-500 ${fontClass}`}>
              <InlineText
                as="span"
                lang={locale}
                value={footerNote}
                onCommit={(v) => setField((d) => { d.footerNote[lang] = v; })}
                placeholder="Footer prompt"
              />{' '}
              <span className="font-semibold text-rmc-green">
                {pick({ en: 'Get in touch', rw: 'Twandikire', ar: 'تواصل معنا' }, locale)}
              </span>
            </p>
            <p className="mt-1.5 text-xs text-gray-400">
              Contact email:{' '}
              <InlineText
                as="span"
                value={content.contactEmail}
                onCommit={(v) => setField((d) => { d.contactEmail = v; })}
                className="font-semibold text-rmc-green"
                placeholder="email@example.org"
              />
            </p>
          </div>
        ) : (
          <p
            dir={dir}
            className={`mt-12 text-center text-sm text-gray-500 transition-all duration-700 delay-500 motion-reduce:transition-none ${fontClass} ${
              titleVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {footerNote}{' '}
            <a
              href={`mailto:${content.contactEmail}`}
              className="font-semibold text-rmc-green hover:underline"
            >
              {pick({ en: 'Get in touch', rw: 'Twandikire', ar: 'تواصل معنا' }, locale)}
            </a>
          </p>
        )}
      </div>

      {openIndex !== null && content.items[openIndex] && (
        <PartnerModal
          partner={content.items[openIndex]}
          sector={pick(content.items[openIndex].sector, locale)}
          description={pick(content.items[openIndex].description, locale)}
          locale={locale}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
