'use client';

import { useParams } from 'next/navigation';
import { BookOpen, Heart, GraduationCap, Globe, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { assetUrl } from '@/lib/api';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  ContentKeys,
  AREAS_DEFAULT,
  pick,
  isRtl,
  type AreasContent,
  type AreaItem,
  type Locale,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineText } from '@/components/edit-mode/InlineText';
import { InlineImage } from '@/components/edit-mode/InlineImage';
import { InlineSelect, type InlineSelectOption } from '@/components/edit-mode/InlineSelect';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';

/** Lucide icon name → component. Falls back to Globe for unknown names. */
const ICONS: Record<string, LucideIcon> = { BookOpen, Heart, GraduationCap, Globe };

/**
 * Where a pillar card links. Dawah is consolidated with the full Dawah section:
 * its pillar leads straight to `/dawah` (courses, library, discussions) instead
 * of the generic `/areas/dawah` page (which now redirects there too).
 */
function areaHref(locale: string, slug: string): string {
  return slug === 'dawah' ? `/${locale}/dawah` : `/${locale}/areas/${slug}`;
}

/** Icon choices offered in edit mode (must be keys of ICONS). */
const ICON_OPTIONS: InlineSelectOption[] = [
  { value: 'BookOpen', label: 'Book', icon: BookOpen },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'GraduationCap', label: 'Education', icon: GraduationCap },
  { value: 'Globe', label: 'Globe', icon: Globe },
];

interface PillarCardEditHandlers {
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
  onImage: (key: string) => void;
  onRemoveImage: () => void;
  onIcon: (value: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function PillarCard({
  item,
  index,
  itemIndex,
  count,
  locale,
  delay,
  editing,
  handlers,
}: {
  item: AreaItem;
  index: string;
  itemIndex: number;
  count: number;
  locale: string;
  delay: number;
  editing: boolean;
  handlers: PillarCardEditHandlers;
}) {
  const { ref, visible } = useScrollReveal(0.12);
  const Icon = ICONS[item.icon] ?? Globe;
  const rtl = isRtl(locale);
  const lang = locale as Locale;
  const arFont = locale === 'ar' ? 'font-arabic' : '';
  const show = editing || visible;

  // Shared visual bits (identical in both modes).
  const ghostNumeral = (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-2 right-5 select-none font-bold leading-none tracking-tighter text-rmc-green/10 text-[6rem] md:text-[7rem] [-webkit-text-stroke:1.5px_rgba(26,122,74,0.14)] [-webkit-text-fill-color:transparent] transition-all duration-500 group-hover:text-rmc-gold/30 group-hover:[-webkit-text-stroke-color:rgba(212,160,23,0.5)]"
    >
      {index}
    </span>
  );

  const iconTile = (
    <span className="grid h-full w-full place-items-center bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white">
      <Icon className="h-8 w-8" />
    </span>
  );

  const hairline = (
    <span
      aria-hidden
      className="relative mt-3 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
    />
  );

  const wrapperClass = `transition-all duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none h-full ${
    show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
  }`;

  // ── Edit mode: a non-navigating card whose visible fields edit in place ──
  if (editing) {
    return (
      <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={wrapperClass}>
        <div
          dir={rtl ? 'rtl' : 'ltr'}
          className="group relative flex h-full flex-col overflow-visible rounded-lg border border-dashed border-rmc-green/40 bg-white p-7 lg:p-8"
        >
          <CardEditToolbar
            canMoveUp={itemIndex > 0}
            canMoveDown={itemIndex < count - 1}
            onMoveUp={handlers.onMoveUp}
            onMoveDown={handlers.onMoveDown}
            onDelete={handlers.onDelete}
          />

          {ghostNumeral}

          {/* Icon tile or hero image — click to upload/replace; pick fallback icon */}
          <div className="relative h-16 w-16 shrink-0">
            <InlineImage
              value={item.imageKey ?? ''}
              onChange={handlers.onImage}
              onRemove={handlers.onRemoveImage}
              folder="areas"
              alt=""
              className="h-16 w-16 rounded-lg"
              imgClassName="object-cover"
              placeholder={iconTile}
            />
            {!item.imageKey && (
              <InlineSelect
                value={item.icon}
                onChange={handlers.onIcon}
                options={ICON_OPTIONS}
                aria-label="Choose card icon"
                className="absolute -bottom-2 -right-2 z-10"
              />
            )}
          </div>

          <p className="relative mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-rmc-gold">
            Pillar {index}
          </p>
          <InlineText
            as="h3"
            lang={locale}
            value={pick(item.title, locale)}
            editValue={item.title[lang]}
            onCommit={handlers.onTitle}
            dir={rtl ? 'rtl' : 'ltr'}
            className={`relative mt-1.5 text-xl font-bold text-gray-900 ${arFont}`}
            placeholder="Card title"
          />

          {hairline}

          <InlineText
            as="p"
            lang={locale}
            value={pick(item.description, locale)}
            editValue={item.description[lang]}
            onCommit={handlers.onDescription}
            dir={rtl ? 'rtl' : 'ltr'}
            className={`relative mt-4 text-sm leading-relaxed text-gray-500 ${arFont}`}
            placeholder="Short description"
          />

          {/* This card links to a detail page; its slug + rich content are edited
              from the card's full editor (coming next), not inline here. */}
          <p className="relative mt-5 text-[11px] font-medium text-gray-400" dir="ltr">
            Links to {item.slug ? areaHref(locale, item.slug) : `/${locale}/areas/…`}
          </p>
        </div>
      </div>
    );
  }

  // ── Public / read-only ──
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={wrapperClass}>
      <Link
        href={areaHref(locale, item.slug)}
        dir={rtl ? 'rtl' : 'ltr'}
        className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-200/70 bg-white p-7 lg:p-8 transition-all duration-300 hover:-translate-y-2 hover:border-rmc-green/30 hover:shadow-[0_12px_28px_-16px_rgba(26,122,74,0.2)] cursor-pointer"
      >
        {ghostNumeral}

        {/* Icon tile or hero image */}
        {item.imageKey ? (
          <span className="relative block w-16 h-16 rounded-lg overflow-hidden shadow-md ring-1 ring-inset ring-rmc-gold/30 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(item.imageKey)} alt="" className="w-full h-full object-cover" aria-hidden />
          </span>
        ) : (
          <span className="relative grid place-items-center w-16 h-16 rounded-lg bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
            <Icon className="w-8 h-8" />
          </span>
        )}

        {/* Always-visible gold pillar label + title */}
        <p className="relative mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-rmc-gold">
          Pillar {index}
        </p>
        <h3 className={`relative mt-1.5 text-xl font-bold text-gray-900 ${arFont}`}>
          {pick(item.title, locale)}
        </h3>

        {hairline}

        {/* Description */}
        <p className={`relative mt-4 text-sm leading-relaxed text-gray-500 ${arFont}`}>
          {pick(item.description, locale)}
        </p>

        {/* "Learn more" cue */}
        <p className="relative mt-5 text-xs font-semibold text-rmc-green opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Learn more →
        </p>
      </Link>
    </div>
  );
}

export function AreasOfInterventionSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  // Content managed from Admin → Content → Areas of Intervention. Falls back to
  // the built-in defaults until something is saved. In super-admin Edit Mode the
  // section reflects in-progress edits live (see `useEditableContent`); on the
  // public site this behaves exactly like a fetch-once-then-merge-over-defaults.
  const { content, editing, setField } = useEditableContent<AreasContent>(
    ContentKeys.areas,
    AREAS_DEFAULT,
  );
  const { bumpSeed } = useEditMode();
  const lang = locale as Locale;

  const deleteArea = (i: number) => {
    setField((d) => { d.items.splice(i, 1); });
    bumpSeed(); // re-seed remaining index-keyed editables to their new positions
  };

  const moveArea = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    setField((d) => { [d.items[i], d.items[j]] = [d.items[j], d.items[i]]; });
    bumpSeed();
  };

  const rtl = isRtl(locale);
  const arFont = locale === 'ar' ? 'font-arabic' : '';

  return (
    <section className="relative overflow-hidden bg-transparent py-12 md:py-16">
      {/* Light Islamic geometry + symmetric gold hairline seams to the darker neighbouring sections */}
      <div aria-hidden className="absolute inset-0 pattern-light opacity-60" />
      {/* Airy brand glow anchors — subtle, never heavy */}
      <div aria-hidden className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-rmc-green-light/50 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-rmc-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section header ── */}
        <div
          ref={titleRef}
          dir={rtl ? 'rtl' : 'ltr'}
          className={`mx-auto mb-16 max-w-2xl text-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <h2 className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${arFont}`}>
            {editing ? (
              <>
                <InlineText
                  as="span"
                  lang={locale}
                  value={pick(content.title, locale)}
                  editValue={content.title[lang]}
                  onCommit={(v) => setField((d) => { d.title[lang] = v; })}
                  dir={rtl ? 'rtl' : 'ltr'}
                  placeholder="Title"
                />{' '}
                <InlineText
                  as="span"
                  lang={locale}
                  value={pick(content.titleAccent, locale)}
                  editValue={content.titleAccent[lang]}
                  onCommit={(v) => setField((d) => { d.titleAccent[lang] = v; })}
                  className="text-rmc-green"
                  dir={rtl ? 'rtl' : 'ltr'}
                  placeholder="Accent"
                />
              </>
            ) : (
              <>
                {pick(content.title, locale)}{' '}
                <span className="text-rmc-green">{pick(content.titleAccent, locale)}</span>
              </>
            )}
          </h2>

          <div className="ornament-divider mx-auto my-4 max-w-xs" aria-hidden>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
          </div>

          {editing ? (
            <InlineText
              as="p"
              lang={locale}
              value={pick(content.lede, locale)}
              editValue={content.lede[lang]}
              onCommit={(v) => setField((d) => { d.lede[lang] = v; })}
              dir={rtl ? 'rtl' : 'ltr'}
              className={`mx-auto max-w-xl text-sm leading-relaxed text-gray-500 md:text-base ${arFont}`}
              placeholder="Section lede"
            />
          ) : (
            <p className={`mx-auto max-w-xl text-sm leading-relaxed text-gray-500 md:text-base ${arFont}`}>
              {pick(content.lede, locale)}
            </p>
          )}
        </div>

        {/* ── Numbered pillar showcase ── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((item, i) => (
            <PillarCard
              key={i}
              item={item}
              index={String(i + 1).padStart(2, '0')}
              itemIndex={i}
              count={content.items.length}
              locale={locale}
              delay={i * 110}
              editing={editing}
              handlers={{
                onTitle: (v) => setField((d) => { d.items[i].title[lang] = v; }),
                onDescription: (v) => setField((d) => { d.items[i].description[lang] = v; }),
                onImage: (key) => setField((d) => { d.items[i].imageKey = key; }),
                onRemoveImage: () => setField((d) => { d.items[i].imageKey = ''; }),
                onIcon: (v) => setField((d) => { d.items[i].icon = v; }),
                onDelete: () => deleteArea(i),
                onMoveUp: () => moveArea(i, -1),
                onMoveDown: () => moveArea(i, 1),
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
