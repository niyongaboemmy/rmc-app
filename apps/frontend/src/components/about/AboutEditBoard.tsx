'use client';

/**
 * In-context editable About page — shown IN PLACE of the public About body when a
 * super-admin is in Edit Mode (see `AboutSwitch`). It mirrors the real
 * `app/[locale]/about/page.tsx` markup so what the admin edits looks like the
 * live page, and every admin-managed piece of text is click-to-edit in place.
 *
 * Unlike the old standalone `/admin/content/live` editor this is driven by the
 * navbar Edit Mode and the SHARED preview store: edits write into the `about`
 * draft (flat `{base}{En|Rw|Ar}` keys + a `leaders[]` array) and are published or
 * discarded by the global Edit Mode bar — no separate Save button, and editing
 * follows the current site language (switch languages with the site switcher).
 *
 * Rich-text fields (history / mission / vision) hold HTML and edit via a
 * contentEditable that captures innerHTML; plain fields capture innerText.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Images, ArrowRight, Mail, Phone } from 'lucide-react';
import { ContentKeys, type Locale } from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { PageHero } from '@/components/layout/PageHero';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { InlineImage } from '@/components/edit-mode/InlineImage';
import { HistoryTimeline } from '@/components/about/HistoryTimeline';
import { ImageCarousel3D } from '@/components/about/ImageCarousel3D';
import { assetUrl } from '@/lib/api';
import { publicApi } from '@/lib/public-api';

interface Leader {
  id: string; image: string;
  nameEn: string; nameRw: string; nameAr: string;
  roleEn: string; roleRw: string; roleAr: string;
  /** Long-form profile. Public site shows it only inside the leader's modal. */
  bioEn?: string; bioRw?: string; bioAr?: string;
  email?: string; phone?: string;
}

type AboutBlob = { [key: string]: unknown; leaders?: Leader[] };

const suffixOf = (l: string) => (l === 'rw' ? 'Rw' : l === 'ar' ? 'Ar' : 'En');

// Fallback leaders — identical to the public page defaults, so leadership looks
// right until the admin saves their own.
const LEADERS_DEFAULT: Leader[] = [
  { id: 'm1', image: '/leaders/mufti.jpg', nameEn: 'Sheikh SINDAYIGAYA Musa', nameRw: 'Sheikh SINDAYIGAYA Musa', nameAr: 'Sheikh SINDAYIGAYA Musa', roleEn: 'Mufti of Rwanda', roleRw: '', roleAr: '' },
  { id: 'm2', image: '/leaders/deputy-mufti.jpg', nameEn: 'Sheikh MUSHUMBA Yunnus', nameRw: 'Sheikh MUSHUMBA Yunnus', nameAr: 'Sheikh MUSHUMBA Yunnus', roleEn: 'Deputy Mufti of Rwanda', roleRw: '', roleAr: '' },
  { id: 'm3', image: '/leaders/qadhi.jpg', nameEn: 'Sheikh SEGISEKURE Ibrahim', nameRw: 'Sheikh SEGISEKURE Ibrahim', nameAr: 'Sheikh SEGISEKURE Ibrahim', roleEn: 'Qadhwi of Rwanda', roleRw: '', roleAr: '' },
  { id: 'm4', image: '/leaders/majlisi-president.jpg', nameEn: 'Sheikh NZANAHAYO Qassim', nameRw: 'Sheikh NZANAHAYO Qassim', nameAr: 'Sheikh NZANAHAYO Qassim', roleEn: 'President of The Majlisi Shuyukh', roleRw: '', roleAr: '' },
  { id: 'm5', image: '/leaders/mufti-advisor.jpg', nameEn: 'Sheikh MBARUSHIMANA Suleiman', nameRw: 'Sheikh MBARUSHIMANA Suleiman', nameAr: 'Sheikh MBARUSHIMANA Suleiman', roleEn: 'Advisor to the Mufti of Rwanda', roleRw: '', roleAr: '' },
  { id: 'm6', image: '/leaders/executive-secretary.jpg', nameEn: 'Mr. SIBOMANA Salim', nameRw: 'Mr. SIBOMANA Salim', nameAr: 'Mr. SIBOMANA Salim', roleEn: 'Executive Secretary', roleRw: '', roleAr: '' },
];

// ─── Inline-editable primitive (always editable — the board only renders in edit mode) ───

function Editable({
  value, onChange, rich = false, tag = 'div', className = '', dir = 'ltr', placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rich?: boolean;
  tag?: 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  // Seed once on mount; the parent remounts this subtree (key by locale +
  // seedVersion) to re-seed on language switch / publish / discard, but typing
  // never remounts it — that keeps the caret from jumping.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (rich) el.innerHTML = value ?? '';
    else el.innerText = value ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const Tag = tag as React.ElementType;
  const commit = (e: React.SyntheticEvent<HTMLElement>) =>
    onChange(rich ? e.currentTarget.innerHTML : e.currentTarget.innerText);
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      dir={dir}
      data-ph={placeholder}
      onInput={commit}
      onBlur={commit}
      className={`ie-editable ${className}`}
    />
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────────

export function AboutEditBoard({ initial }: { initial: Record<string, unknown> | null }) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('about');
  const { seedVersion } = useEditMode();
  const { content, setField } = useEditableContent<AboutBlob>(
    ContentKeys.about,
    (initial ?? {}) as AboutBlob,
  );

  const sfx = suffixOf(locale);
  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? 'font-arabic' : '';

  const cms = (base: string) => (content[`${base}${sfx}`] as string) ?? '';
  const stripHtml = (h: string) => h.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  // Seed each field with the SAME value the public page shows: the saved CMS text
  // if present, otherwise the i18n fallback — so edit mode mirrors the live page
  // instead of appearing blank when nothing has been saved yet.
  const field = (base: string, fallback: string) => (cms(base).trim() ? cms(base) : fallback);
  const richField = (base: string, fallbackHtml: string) =>
    (stripHtml(cms(base)) ? cms(base) : fallbackHtml);
  const setF = (base: string, v: string) => setField((d) => { d[`${base}${sfx}`] = v; });

  // Leaders — reactive draft (falls back to the seeded defaults until edited).
  const leaders: Leader[] =
    Array.isArray(content.leaders) && content.leaders.length ? (content.leaders as Leader[]) : LEADERS_DEFAULT;
  const writeLeaders = (next: Leader[]) => setField((d) => { d.leaders = next; });
  const setLeader = (id: string, key: keyof Leader, value: string) =>
    writeLeaders(leaders.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  const addLeader = () =>
    writeLeaders([...leaders, {
      id: crypto.randomUUID(),
      image: '', nameEn: 'New leader', nameRw: '', nameAr: '', roleEn: 'Role', roleRw: '', roleAr: '',
      bioEn: '', bioRw: '', bioAr: '', email: '', phone: '',
    }]);
  const removeLeader = (id: string) => writeLeaders(leaders.filter((l) => l.id !== id));

  const nameKey = `name${sfx}` as keyof Leader;
  const roleKey = `role${sfx}` as keyof Leader;
  const bioKey = `bio${sfx}` as keyof Leader;

  // Gallery preview carousel — same source as the public page.
  const [gallery, setGallery] = useState<{ src: string; alt: string }[]>([]);
  useEffect(() => {
    let active = true;
    publicApi.getGallery(undefined, 1)
      .then((res) => { if (active) setGallery(res.data.map((g) => ({ src: assetUrl(g.mediumKey ?? g.fileKey), alt: g.title ?? 'Gallery' }))); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div key={`${locale}:${seedVersion}`}>
      {/* Small hint that the board is a super-admin edit surface */}
      <div className="mx-auto mt-3 flex max-w-7xl items-center gap-2 px-4 text-xs text-rmc-green sm:px-6 lg:px-8">
        <span className="rounded-full bg-rmc-green/10 px-2 py-0.5 font-semibold">Editing the About page</span>
        <span className="text-rmc-green/70">— click any text or image to edit. Publish from the bar below.</span>
      </div>

      {/* 1. HERO — the SAME `PageHero` the public page renders, with the editable
          nodes passed in as its title and subtitle. It used to be a hand-rolled copy
          "mirroring PageHero", which had drifted: it added an eyebrow pill and an
          ornament divider the live page never showed, so an admin was editing a hero
          that did not match the one visitors saw. */}
      <PageHero
        paddingClassName="pt-28 pb-10"
        minHeightClassName="min-h-[40vh]"
        title={
          <Editable
            tag="span"
            value={field('title', t('title'))}
            onChange={(v) => setF('title', v)}
            dir={dir}
            placeholder={t('title')}
            className={fontClass}
          />
        }
        subtitle={
          <Editable
            tag="span"
            value={field('subtitle', t('subtitle'))}
            onChange={(v) => setF('subtitle', v)}
            dir={dir}
            placeholder={t('subtitle')}
            className={fontClass}
          />
        }
      />

      {/* 2. WHO WE ARE */}
      <section className="relative overflow-hidden bg-transparent py-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-[520px] w-[520px] -translate-y-1/2 translate-x-1/3 rounded-full bg-rmc-green-light opacity-50 blur-[90px]" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-[420px] w-[420px] -translate-x-1/3 translate-y-1/2 rounded-full bg-rmc-gold/5 blur-[90px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className={`mb-5 text-3xl font-medium leading-[1.15] tracking-tight text-rmc-green-deep md:text-[2.6rem] ${fontClass}`}>
              <Editable tag="span" value={field('whoWeAreHeading', t('whoWeAre.heading'))} onChange={(v) => setF('whoWeAreHeading', v)} dir={dir} placeholder={t('whoWeAre.heading')} />{' '}
              <Editable tag="span" value={field('whoWeAreHighlight', t('whoWeAre.headingHighlight'))} onChange={(v) => setF('whoWeAreHighlight', v)} dir={dir} placeholder={t('whoWeAre.headingHighlight')} className="text-rmc-green" />
            </h2>
            <div className="ornament-divider mx-auto mb-3 max-w-md">
              <Editable value={field('verse', 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا')} onChange={(v) => setF('verse', v)} dir="rtl"
                placeholder="وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا" className="px-2 text-center font-arabic text-lg leading-loose text-rmc-green-dark md:text-xl" />
            </div>
            <Editable value={field('verseRef', '“Hold firmly to the rope of Allah, all together” — Aal-Imran 3:103')} onChange={(v) => setF('verseRef', v)} dir={dir}
              placeholder="“Hold firmly to the rope of Allah, all together” — Aal-Imran 3:103" className={`mb-6 text-[11px] font-semibold tracking-wide text-rmc-gold ${fontClass}`} />
          </div>
          <div className="mx-auto max-w-4xl px-4 text-sm leading-relaxed text-gray-500 sm:px-6 md:text-base">
            <Editable rich value={richField('history', `<p>${t('whoWeAre.p1')}</p><p>${t('whoWeAre.p2')}</p><p>${t('whoWeAre.p3')}</p>`)} onChange={(v) => setF('history', v)} dir={dir}
              placeholder={t('whoWeAre.p1')} className={`prose prose-sm max-w-none text-gray-500 prose-headings:text-gray-900 prose-a:text-rmc-green prose-strong:text-gray-900 md:prose-base ${fontClass}`} />
          </div>
        </div>
      </section>

      {/* 3. MISSION / VISION */}
      <section className="bg-transparent px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-6 shadow-sm ring-1 ring-gray-200/70 md:p-7">
              <h2 className="text-center text-2xl font-medium tracking-tight text-gray-900">
                <Editable tag="span" value={field('missionTitle', t('mission.title'))} onChange={(v) => setF('missionTitle', v)} dir={dir} placeholder={t('mission.title')} className={fontClass} />
              </h2>
              <Editable rich value={richField('mission', `<p><strong>${t('mission.items.i1.label')}:</strong> ${t('mission.items.i1.text')}</p>`)} onChange={(v) => setF('mission', v)} dir={dir}
                placeholder="Mission statement…" className={`prose prose-sm mt-3 max-w-none text-gray-500 ${fontClass}`} />
            </div>
            <div className="flex flex-col rounded-lg bg-rmc-green-deep p-6 text-white shadow-lg shadow-rmc-green/20 ring-1 ring-white/10 md:p-7">
              <h2 className="text-center text-2xl font-medium tracking-tight text-white">
                <Editable tag="span" value={field('visionTitle', t('vision.title'))} onChange={(v) => setF('visionTitle', v)} dir={dir} placeholder={t('vision.title')} className={fontClass} />
              </h2>
              <Editable rich value={richField('vision', `<p><strong>${t('vision.items.i1.label')}:</strong> ${t('vision.items.i1.text')}</p><p><strong>${t('vision.items.i2.label')}:</strong> ${t('vision.items.i2.text')}</p>`)} onChange={(v) => setF('vision', v)} dir={dir}
                placeholder="Vision statement…" className={`prose prose-sm prose-invert mt-3 max-w-none text-white/70 ${fontClass}`} />
            </div>
          </div>
        </div>
      </section>

      {/* 4. LEADERSHIP */}
      <section className="relative overflow-hidden bg-transparent py-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
        <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-[480px] w-[480px] -translate-x-1/3 -translate-y-1/2 rounded-full bg-rmc-green-light opacity-50 blur-[90px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <Editable tag="h2" value={field('leadershipTitle', t('leadership.title'))} onChange={(v) => setF('leadershipTitle', v)} dir={dir}
              placeholder={t('leadership.title')} className={`inline-block text-3xl font-medium text-rmc-green-deep md:text-4xl ${fontClass}`} />
            <div className="ornament-divider mx-auto my-4 max-w-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
            </div>
            <Editable value={field('leadershipSubtitle', t('leadership.subtitle'))} onChange={(v) => setF('leadershipSubtitle', v)} dir={dir}
              placeholder={t('leadership.subtitle')} className={`mx-auto max-w-xl text-sm text-gray-400 md:text-base ${fontClass}`} />
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
            {leaders.map((l) => (
              <div key={l.id} className="group relative flex items-center gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <button onClick={() => removeLeader(l.id)} title="Remove leader"
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="relative shrink-0">
                  <InlineImage
                    value={l.image}
                    onChange={(key) => setLeader(l.id, 'image', key)}
                    folder="leaders"
                    alt={(l[nameKey] as string) || ''}
                    className="h-20 w-20 rounded-full ring-1 ring-gray-200"
                    imgClassName="object-cover object-top"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Editable value={(l[roleKey] as string) || ''} onChange={(v) => setLeader(l.id, roleKey, v)} dir={dir}
                    placeholder="Role" className={`inline-flex rounded-lg bg-rmc-green-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rmc-green-dark ${fontClass}`} />
                  <Editable tag="h3" value={(l[nameKey] as string) || ''} onChange={(v) => setLeader(l.id, nameKey, v)} dir={dir}
                    placeholder="Name" className={`mt-2 truncate font-medium text-gray-900 ${fontClass}`} />

                  {/* Profile — public site shows this only inside the leader's
                      modal, so it is edited here rather than on the card. */}
                  <Editable value={(l[bioKey] as string) || ''} onChange={(v) => setLeader(l.id, bioKey, v)} dir={dir}
                    placeholder="Profile / bio (shown in the pop-up)"
                    className={`mt-2 block whitespace-pre-line text-xs leading-relaxed text-gray-500 ${fontClass}`} />
                  <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
                      <Editable tag="span" value={l.email || ''} onChange={(v) => setLeader(l.id, 'email', v)} placeholder="email (optional)" className="truncate" />
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
                      <Editable tag="span" value={l.phone || ''} onChange={(v) => setLeader(l.id, 'phone', v)} placeholder="phone (optional)" dir="ltr" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addLeader}
              className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rmc-green/30 text-rmc-green/70 transition hover:border-rmc-green/60 hover:text-rmc-green">
              <Plus className="h-6 w-6" /><span className="text-sm font-semibold">Add leader</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. HISTORY TIMELINE — real component (entries edited in Content → History) */}
      <HistoryTimeline locale={locale} />

      {/* 6. GALLERY PREVIEW */}
      <section className="bg-transparent px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <Editable tag="h2" value={field('galleryTitle', t('gallery.title'))} onChange={(v) => setF('galleryTitle', v)} dir={dir}
              placeholder={t('gallery.title')} className={`inline-block text-3xl font-medium text-rmc-green-deep md:text-4xl ${fontClass}`} />
            <div className="ornament-divider mx-auto my-4 max-w-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
            </div>
            <Editable value={field('gallerySubtitle', t('gallery.subtitle'))} onChange={(v) => setF('gallerySubtitle', v)} dir={dir}
              placeholder={t('gallery.subtitle')} className={`mx-auto max-w-2xl text-sm text-gray-400 md:text-base ${fontClass}`} />
          </div>
          {gallery.length > 0 && (
            <div className="relative mx-auto min-h-[320px] w-full max-w-2xl overflow-hidden rounded-lg md:min-h-[400px]">
              <ImageCarousel3D images={gallery} />
            </div>
          )}
          <div className="mt-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-lg bg-rmc-green-deep px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
              <Images className="h-4 w-4" /> {t('gallery.cta')} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
