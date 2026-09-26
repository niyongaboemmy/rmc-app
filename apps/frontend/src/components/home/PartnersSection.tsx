'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ExternalLink, X } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { PreviewOverlayShell } from '@/components/ui/PreviewOverlayShell';
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

/** Edit Mode card — non-navigating, every field editable in place. The public
 *  site shows partners in the moving rows below instead (see `MarqueeRow`). */
function EditablePartnerCard({
  partner,
  sector,
  description,
  locale,
  index,
  count,
  handlers,
}: {
  partner: PartnerItem;
  sector: string;
  description: string;
  locale: string;
  index: number;
  count: number;
  handlers: PartnerCardEditHandlers;
}) {
  // `sector`/`description` arrive locale-resolved for display; the edit boxes want
  // this locale's own text so an untranslated field opens empty (see `editValue`).
  const lang = locale as Locale;

  return (
    <div className="relative flex h-full flex-col items-center rounded-lg border border-dashed border-rmc-green/40 bg-white px-6 py-8">
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
        editValue={partner.sector[lang]}
        onCommit={handlers.onSector}
        className="mt-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-gold"
        placeholder="Sector"
      />

      {/* Description (per-language) — shown in the partner modal */}
      <InlineText
        as="p"
        lang={locale}
        value={description}
        editValue={partner.description?.[lang] ?? ''}
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

/** A compact partner tile for the moving rows. Clicking opens the detail modal. */
function PartnerTile({
  partner,
  sector,
  locale,
  inert,
  onOpen,
}: {
  partner: PartnerItem;
  sector: string;
  locale: string;
  /** A loop copy — kept out of the tab order (its row hides it from assistive tech). */
  inert: boolean;
  onOpen: () => void;
}) {
  const rtl = isRtl(locale);

  return (
    <button
      type="button"
      onClick={onOpen}
      tabIndex={inert ? -1 : undefined}
      aria-label={`${pick({ en: 'About', rw: 'Ibyerekeye', ar: 'حول' }, locale)} ${partner.name}`}
      className="group relative flex h-full w-48 flex-col items-center rounded-lg border border-gray-200/70 bg-white px-3 py-5 text-center transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:shadow-[0_12px_28px_-16px_rgba(26,122,74,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Logo — fixed box so every partner aligns regardless of aspect ratio.
          Guard the empty case: next/image throws on an empty src (can happen for
          a partner added but not yet given a logo before publish). */}
      <div className="relative h-14 w-full">
        {partner.logo ? (
          <Image
            src={assetUrl(partner.logo)}
            alt={`${partner.name} logo`}
            fill
            sizes="144px"
            className="object-contain"
          />
        ) : (
          <div className="h-full w-full rounded-md bg-gray-50" aria-hidden />
        )}
      </div>

      <p className="mt-4 w-full truncate text-xs font-bold uppercase tracking-wide text-gray-900 transition-colors duration-200 group-hover:text-rmc-green">
        {partner.name}
      </p>
      <p
        dir={rtl ? 'rtl' : 'ltr'}
        className={`mt-1 w-full text-[10px] font-semibold text-rmc-gold ${rtl ? 'font-arabic line-clamp-2' : 'truncate uppercase tracking-[0.1em]'}`}
      >
        {sector}
      </p>
    </button>
  );
}

type PartnerEntry = { partner: PartnerItem; index: number };

/** Tiles in one copy of a row — enough that it spans the widest container, so the
 *  loop never shows a gap however few partners there are. */
const MIN_TILES_PER_LOOP = 8;
/** Seconds per tile, so a row moves at the same speed whatever its length. */
const SECONDS_PER_TILE = 4;
/** From this many partners the two rows split them; below it, both show them all. */
const SPLIT_AT = 8;

/**
 * One endlessly scrolling row. The track holds the row twice over and slides by
 * half its width, so the second copy lands exactly where the first began. Hover
 * or keyboard focus pauses it (see `.animate-marquee` in globals.css).
 */
function MarqueeRow({
  entries,
  reverse,
  mirror,
  locale,
  onOpen,
}: {
  entries: PartnerEntry[];
  reverse: boolean;
  /** The row repeats partners already listed in the other one — hide it from AT. */
  mirror: boolean;
  locale: string;
  onOpen: (index: number) => void;
}) {
  const reps = Math.ceil(MIN_TILES_PER_LOOP / entries.length);
  const loop = Array.from({ length: reps }, () => entries).flat();
  const track = [...loop, ...loop];

  // Hold the loop while the row is scrolled out of view — nothing to see, so no
  // reason to keep the compositor animating it.
  const viewportRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // LTR regardless of locale: the loop's -50% slide assumes the track starts at
    // the left edge. Edge fades soften where tiles enter and leave.
    <div
      ref={viewportRef}
      dir="ltr"
      aria-hidden={mirror || undefined}
      className="overflow-hidden py-1.5 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto"
    >
      <ul
        className={`flex w-max ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
        // Paused only while off screen; otherwise left unset so the hover/focus pause
        // in globals.css still applies.
        style={{
          animationDuration: `${loop.length * SECONDS_PER_TILE}s`,
          animationPlayState: onScreen ? undefined : 'paused',
        }}
      >
        {track.map(({ partner, index }, i) => {
          // Only the first pass of a non-mirror row is real content; the rest is loop.
          const inert = mirror || i >= entries.length;
          return (
            <li key={i} className="shrink-0 pr-4" aria-hidden={(!mirror && inert) || undefined}>
              <PartnerTile
                partner={partner}
                sector={pick(partner.sector, locale)}
                locale={locale}
                inert={inert}
                onOpen={() => onOpen(index)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * An admin types a partner's site as they think of it — "reb.gov.rw" as often as
 * "https://reb.gov.rw". A bare host in an href is a RELATIVE path, so the first
 * form used to navigate to /en/reb.gov.rw on our own site instead of leaving it.
 */
function externalHref(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

/** "https://www.reb.gov.rw/about" → "reb.gov.rw", the part worth showing. */
function hostLabel(url: string): string {
  try {
    return new URL(externalHref(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const TITLE_ID = 'partner-modal-title';

/* Partner detail modal — the short descriptive note + a link out to the
   partner's website when there is one.

   The behaviour (portal, Esc, body-scroll lock, focus trap, focus returned to
   the card that opened it, dialog semantics) all comes from PreviewOverlayShell;
   this component owns only the chrome. It used to hand-roll a portal and an Esc
   listener and had none of the rest. */
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
  const rtl = isRtl(locale);

  return (
    <PreviewOverlayShell
      onClose={onClose}
      labelledBy={TITLE_ID}
      zIndexClassName="z-[9999]"
      className="flex items-end justify-center p-4 sm:items-center"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />

      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className="relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl animate-modal-in"
      >
        {/* Banner — a plain field with only the Islamic pattern behind the mark.
            Partner logos arrive in every shape and colour, so the tile keeps
            every one of them at the same size regardless of aspect ratio. */}
        <div className="relative flex h-32 items-center justify-center">
          <div aria-hidden className="absolute inset-0 pattern-islamic opacity-20" />

          {/* Padding lives on the image, not here: a `fill` image resolves
              inset-0 against the padding box, so padding on this tile would do
              nothing to it. */}
          <div className="relative flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg bg-white/90 shadow-sm ring-1 ring-black/5">
            {partner.logo ? (
              <Image
                src={assetUrl(partner.logo)}
                alt={`${partner.name} logo`}
                fill
                sizes="160px"
                className="object-contain p-3"
              />
            ) : (
              <div className="h-full w-full bg-gray-100" aria-hidden />
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={pick({ en: 'Close', rw: 'Funga', ar: 'إغلاق' }, locale)}
            className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Details */}
        <div className="px-6 pb-6 pt-5 text-start">
          <h3 id={TITLE_ID} className="text-lg font-bold uppercase tracking-wide text-gray-900">
            {partner.name}
          </h3>

          {sector && (
            <span className="mt-2 inline-flex items-center rounded-full bg-rmc-gold/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#8A6A0F]">
              {sector}
            </span>
          )}

          {description ? (
            <p className="mt-3.5 text-sm leading-relaxed text-gray-600">{description}</p>
          ) : (
            <p className="mt-3.5 text-sm italic text-gray-400">
              {pick(
                { en: 'No description yet.', rw: 'Nta nyandiko irahari.', ar: 'لا يوجد وصف بعد.' },
                locale,
              )}
            </p>
          )}
        </div>

        {/* Footer — the destination named, then the way there. */}
        {partner.website && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-3.5">
            <span className="min-w-0 truncate text-xs text-gray-400" dir="ltr">
              {hostLabel(partner.website)}
            </span>
            <a
              href={externalHref(partner.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-rmc-green px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
            >
              <ExternalLink className="h-4 w-4" />
              {pick({ en: 'Visit website', rw: 'Sura urubuga', ar: 'زيارة الموقع' }, locale)}
            </a>
          </div>
        )}
      </div>
    </PreviewOverlayShell>
  );
}

export function PartnersSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

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
  // Many partners are split across the two rows. With few, both rows carry them
  // all — the second in reverse order, so the rows never mirror each other.
  const entries: PartnerEntry[] = content.items.map((partner, index) => ({ partner, index }));
  const split = entries.length >= SPLIT_AT;
  const [rowA, rowB] = split
    ? [entries.filter((_, i) => i % 2 === 0), entries.filter((_, i) => i % 2 === 1)]
    : [entries, [...entries].reverse()];

  // Unresolved active-locale copy, for the edit boxes only — see `editValue`.
  const rawTitle = content.title[lang];
  const rawLede = content.lede[lang];
  const rawFooterNote = content.footerNote[lang];

  return (
    <section className="relative overflow-hidden bg-transparent py-12 md:py-16">
      {/* Light Islamic geometry + symmetric gold hairline seams */}

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
                editValue={rawTitle}
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
              editValue={rawLede}
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

        {/* Partners — two rows gliding in opposite directions on the public site;
            a static, editable grid in Edit Mode (moving cards can't be edited). */}
        {!editing && entries.length > 0 && (
          <div className="flex flex-col gap-3">
            <MarqueeRow entries={rowA} reverse={false} mirror={false} locale={locale} onOpen={setOpenIndex} />
            <MarqueeRow entries={rowB} reverse mirror={!split} locale={locale} onOpen={setOpenIndex} />
          </div>
        )}

        {editing && (
          <div className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
            {content.items.map((partner, i) => (
              <EditablePartnerCard
                key={i}
                partner={partner}
                sector={pick(partner.sector, locale)}
                description={pick(partner.description, locale)}
                locale={locale}
                index={i}
                count={content.items.length}
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
            <AddCardTile label="Add partner" onClick={addPartner} />
          </div>
        )}

        {/* Footer note */}
        {editing ? (
          <div className="mt-12 text-center">
            <p dir={dir} className={`text-sm text-gray-500 ${fontClass}`}>
              <InlineText
                as="span"
                lang={locale}
                value={footerNote}
                editValue={rawFooterNote}
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
