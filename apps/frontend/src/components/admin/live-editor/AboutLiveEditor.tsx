'use client';

/**
 * Canva-style in-context editor for the public About page.
 *
 * This mirrors the REAL About page (`app/[locale]/about/page.tsx`) markup and
 * styles as closely as possible, so what the admin edits looks exactly like the
 * live page. Every piece of admin-managed text is click-to-edit in place
 * (contentEditable). Language tabs switch the translation; Save persists the
 * whole About blob (+ leaders). The gallery carousel and history timeline are
 * the real components, rendered for fidelity.
 *
 * Scoped to the About page only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ContentKeys, getSiteContent, saveSiteContent } from '@/lib/content-api';
import { useToast } from '@/components/ui/Toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ImageCarousel3D } from '@/components/about/ImageCarousel3D';
import { HistoryTimeline } from '@/components/about/HistoryTimeline';
import { publicApi } from '@/lib/public-api';
import {
  ArrowLeft, Save, Maximize2, Minimize2, Plus, Trash2, MousePointerClick, Images, ArrowRight,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', flag: 'RW' },
  { key: 'ar', label: 'Arabic', flag: 'AR' },
];

const FILE_SERVER = process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';
const fileUrl = (key: string) => `${FILE_SERVER}/api/v1/files/${key}`;
const resolveImg = (v: string) =>
  !v ? '' : /^https?:\/\//.test(v) || v.startsWith('/') ? v : fileUrl(v);

// Same background reel PageHero uses, so the hero matches the live page.
const HERO_SLIDES = [
  'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
  'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
  'https://drive.google.com/thumbnail?id=1dNjgzd30RyYQ0_zCLFoqj83HjGh03bwq&sz=w1600',
];

interface AboutContent { [key: string]: string }
interface Leader {
  id: string; image: string;
  nameEn: string; nameRw: string; nameAr: string;
  roleEn: string; roleRw: string; roleAr: string;
  /** Long-form profile. The public About page shows it only in the leader's pop-up. */
  bioEn?: string; bioRw?: string; bioAr?: string;
  email?: string; phone?: string;
}

// Fallback leaders — identical to the public page's defaults, so leadership
// looks exactly right until the admin saves their own.
const LEADERS_DEFAULT: Leader[] = [
  { id: 'm1', image: 'https://i.postimg.cc/8CKkfkMS/Mufti.jpg',   nameEn: 'Sheikh SINDAYIGAYA Musa',     nameRw: 'Sheikh SINDAYIGAYA Musa',     nameAr: 'Sheikh SINDAYIGAYA Musa',     roleEn: 'Mufti of Rwanda',                 roleRw: '', roleAr: '' },
  { id: 'm2', image: 'https://i.postimg.cc/mkTL1ckm/V1A8567.jpg', nameEn: 'Sheikh MUSHUMBA Yunnus',      nameRw: 'Sheikh MUSHUMBA Yunnus',      nameAr: 'Sheikh MUSHUMBA Yunnus',      roleEn: 'Deputy Mufti of Rwanda',          roleRw: '', roleAr: '' },
  { id: 'm3', image: 'https://i.postimg.cc/9f1JHK96/Qadh.jpg',    nameEn: 'Sheikh SEGISEKURE Ibrahim',   nameRw: 'Sheikh SEGISEKURE Ibrahim',   nameAr: 'Sheikh SEGISEKURE Ibrahim',   roleEn: 'Qadhwi of Rwanda',                roleRw: '', roleAr: '' },
  { id: 'm4', image: 'https://i.postimg.cc/Cx0M5wJm/P1180223.jpg', nameEn: 'Sheikh NZANAHAYO Qassim',    nameRw: 'Sheikh NZANAHAYO Qassim',     nameAr: 'Sheikh NZANAHAYO Qassim',     roleEn: 'President of The Majlisi Shuyukh', roleRw: '', roleAr: '' },
  { id: 'm5', image: 'https://i.postimg.cc/Fsym22m4/P1180220.jpg', nameEn: 'Sheikh MBARUSHIMANA Suleiman', nameRw: 'Sheikh MBARUSHIMANA Suleiman', nameAr: 'Sheikh MBARUSHIMANA Suleiman', roleEn: 'Advisor to the Mufti of Rwanda',  roleRw: '', roleAr: '' },
  { id: 'm6', image: 'https://i.postimg.cc/YSxyqhck/ES-Salim.jpg', nameEn: 'Mr. SIBOMANA Salim',         nameRw: 'Mr. SIBOMANA Salim',          nameAr: 'Mr. SIBOMANA Salim',          roleEn: 'Executive Secretary',             roleRw: '', roleAr: '' },
];

const suffixOf = (l: Lang) => (l === 'en' ? 'En' : l === 'rw' ? 'Rw' : 'Ar');

// ─── Inline-editable primitive ──────────────────────────────────────────────────

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
  // Seed the content ONCE on mount. The parent remounts this subtree when the
  // language changes (the <main> is keyed by lang + load state), which re-seeds
  // with the new translation. We deliberately do NOT re-seed on every `value`
  // change — that is what was wiping keystrokes and jumping the caret.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (rich) el.innerHTML = value ?? '';
    else el.innerText = value ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const Tag = tag as React.ElementType;
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      dir={dir}
      data-ph={placeholder}
      onInput={(e: React.FormEvent<HTMLElement>) => {
        const el = e.currentTarget;
        onChange(rich ? el.innerHTML : el.innerText);
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const el = e.currentTarget;
        onChange(rich ? el.innerHTML : el.innerText);
      }}
      className={`ie-editable rounded-[3px] outline-dashed outline-1 outline-transparent hover:outline-sky-300/70 focus:outline-sky-500 cursor-text transition-[outline-color] ${className}`}
    />
  );
}

// ─── Editor ─────────────────────────────────────────────────────────────────────

export function AboutLiveEditor() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('about');
  const { success, error } = useToast();

  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<AboutContent>({});
  const [leaders, setLeaders] = useState<Leader[]>(LEADERS_DEFAULT);
  const [gallery, setGallery] = useState<{ src: string; alt: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [photoEditId, setPhotoEditId] = useState<string | null>(null);

  const sfx = suffixOf(lang);
  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';

  // Load blob + leaders.
  useEffect(() => {
    let active = true;
    getSiteContent<Partial<AboutContent> & { leaders?: Leader[] }>(ContentKeys.about)
      .then((data) => {
        if (!active || !data) return;
        const { leaders: savedLeaders, ...text } = data;
        setForm(text as AboutContent);
        if (Array.isArray(savedLeaders) && savedLeaders.length) setLeaders(savedLeaders);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    publicApi.getGallery(undefined, 1)
      .then((res) => {
        if (active) setGallery(res.data.map((g) => ({ src: fileUrl(g.mediumKey ?? g.fileKey), alt: g.title ?? 'Gallery' })));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Fullscreen toggle.
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  // Hero background crossfade (mirrors PageHero).
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);

  const field = (key: string) => (form[`${key}${sfx}`] ?? '');
  const setField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [`${key}${sfx}`]: value }));
  }, [sfx]);
  const setLeader = useCallback((id: string, key: keyof Leader, value: string) => {
    setLeaders((prev) => prev.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  }, []);
  const addLeader = () => setLeaders((prev) => [...prev, {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `l${prev.length}-${Date.now()}`,
    image: '', nameEn: 'New leader', nameRw: '', nameAr: '', roleEn: 'Role', roleRw: '', roleAr: '',
    bioEn: '', bioRw: '', bioAr: '', email: '', phone: '',
  }]);
  const removeLeader = (id: string) => setLeaders((prev) => prev.filter((l) => l.id !== id));

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveSiteContent(ContentKeys.about, { ...form, leaders });
      success('About page saved. Changes are live.');
    } catch {
      error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, leaders, success, error]);

  const nameKey = `name${sfx}` as keyof Leader;
  const roleKey = `role${sfx}` as keyof Leader;
  const bioKey = `bio${sfx}` as keyof Leader;
  const langLabel = LANGS.find((l) => l.key === lang)?.label;

  return (
    <div id="live-editor-canvas" className="fixed inset-0 z-[60] bg-white overflow-y-auto">
      <style>{`.ie-editable:empty:before{content:attr(data-ph);color:#94a3b8;opacity:.6;pointer-events:none;}`}</style>

      {/* ============================ THE ABOUT PAGE (editable) ============================ */}
      <div className="min-h-screen">
        {/* Real site navbar — visual only in the editor (fixed over the hero, exactly like /about). */}
        <div className="pointer-events-none select-none">
          <Navbar />
        </div>
        {/* Keyed by language + load state: switching language (or the initial
            data arriving) remounts the editable subtree so each field re-seeds
            with the right text — but typing never remounts it. */}
        <main key={`${lang}:${loading ? 'loading' : 'ready'}`}>

          {/* 1. HERO — mirrors <PageHero eyebrow title subtitle ornament /> */}
          <section className="relative flex min-h-[50vh] items-center overflow-hidden bg-rmc-green-deep">
            {HERO_SLIDES.map((src, i) => (
              <div key={src} className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out" style={{ opacity: i === slide ? 1 : 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover object-center" />
              </div>
            ))}
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/30" />
            <div className="absolute inset-0 pattern-islamic opacity-30" />
            <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-36 pb-14 sm:px-6 lg:px-8">
              <div className="animate-fade-up">
                <div className="text-center mx-auto max-w-3xl">
                  <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm sm:text-xs">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" /> About RMC
                  </div>
                  <Editable tag="h1" value={field('title')} onChange={(v) => setField('title', v)} dir={dir}
                    placeholder={t('title')} className={`font-bold leading-tight text-white drop-shadow-lg text-3xl md:text-4xl lg:text-5xl ${fontClass}`} />
                  <div className="ornament-divider mx-auto my-4 max-w-xs">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
                  </div>
                  <Editable value={field('subtitle')} onChange={(v) => setField('subtitle', v)} dir={dir}
                    placeholder={t('subtitle')} className={`mt-4 text-sm leading-relaxed text-white/75 md:text-base mx-auto max-w-xl ${fontClass}`} />
                </div>
              </div>
            </div>
          </section>

          {/* 2. WHO WE ARE */}
          <section className="relative bg-transparent py-24 md:py-32 overflow-hidden">
            <div aria-hidden className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
            <div aria-hidden className="absolute top-0 right-0 w-[520px] h-[520px] bg-rmc-green-light rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />
            <div aria-hidden className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-[90px] pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2.5 mb-6 px-4 py-1.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 backdrop-blur-sm text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-rmc-green-dark">
                  <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" /> {t('whoWeAre.badge')}
                </div>
                <h2 className={`text-3xl md:text-[2.6rem] font-bold text-gray-900 leading-[1.15] tracking-tight mb-5 ${fontClass}`}>
                  <Editable tag="span" value={field('whoWeAreHeading')} onChange={(v) => setField('whoWeAreHeading', v)} dir={dir} placeholder={t('whoWeAre.heading')} />{' '}
                  <Editable tag="span" value={field('whoWeAreHighlight')} onChange={(v) => setField('whoWeAreHighlight', v)} dir={dir} placeholder={t('whoWeAre.headingHighlight')} className="text-rmc-green" />
                </h2>
                <div className="ornament-divider max-w-md mx-auto mb-3">
                  <Editable value={field('verse')} onChange={(v) => setField('verse', v)} dir="rtl"
                    placeholder="وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا" className="font-arabic text-rmc-green-dark text-lg md:text-xl leading-loose text-center px-2" />
                </div>
                <Editable value={field('verseRef')} onChange={(v) => setField('verseRef', v)} dir={dir}
                  placeholder="“Hold firmly to the rope of Allah…”" className={`text-rmc-gold text-[11px] font-semibold tracking-wide mb-10 ${fontClass}`} />
              </div>
              <div className="max-w-7xl mx-auto text-gray-500 leading-relaxed text-sm md:text-base">
                <Editable rich value={field('history')} onChange={(v) => setField('history', v)} dir={dir}
                  placeholder={`${t('whoWeAre.p1')}`}
                  className={`prose prose-sm md:prose-base max-w-none prose-headings:text-gray-900 prose-a:text-rmc-green prose-strong:text-gray-900 text-gray-500 ${fontClass}`} />
              </div>
            </div>
          </section>

          {/* 3. MISSION / VISION */}
          <section className="py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <div className="flex flex-col justify-start p-8 md:p-10">
                  <h2 className="text-2xl font-bold tracking-tight text-rmc-green mb-7">
                    <span className="relative inline-block pb-2">
                      <Editable tag="span" value={field('missionTitle')} onChange={(v) => setField('missionTitle', v)} dir={dir} placeholder={t('mission.title')} className={fontClass} />
                      <span aria-hidden className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green" />
                    </span>
                  </h2>
                  <Editable rich value={field('mission')} onChange={(v) => setField('mission', v)} dir={dir}
                    placeholder="Mission statement…" className={`prose prose-sm max-w-none text-gray-600 ${fontClass}`} />
                </div>
                <div className="flex flex-col justify-start p-8 md:p-10">
                  <h2 className="text-2xl font-bold tracking-tight text-rmc-gold mb-7">
                    <span className="relative inline-block pb-2">
                      <Editable tag="span" value={field('visionTitle')} onChange={(v) => setField('visionTitle', v)} dir={dir} placeholder={t('vision.title')} className={fontClass} />
                      <span aria-hidden className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green" />
                    </span>
                  </h2>
                  <Editable rich value={field('vision')} onChange={(v) => setField('vision', v)} dir={dir}
                    placeholder="Vision statement…" className={`prose prose-sm max-w-none text-gray-600 ${fontClass}`} />
                </div>
              </div>
            </div>
          </section>

          {/* 4. LEADERSHIP */}
          <section className="relative py-20 bg-transparent overflow-hidden">
            <div aria-hidden className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
            <div aria-hidden className="absolute top-0 left-0 w-[480px] h-[480px] bg-rmc-green-light rounded-full -translate-y-1/2 -translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />
            <div aria-hidden className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 translate-x-1/3 blur-[90px] pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <Editable tag="h2" value={field('leadershipTitle')} onChange={(v) => setField('leadershipTitle', v)} dir={dir}
                  placeholder={t('leadership.title')} className={`text-3xl md:text-4xl font-bold text-gray-900 inline-block ${fontClass}`} />
                <div className="ornament-divider max-w-xs mx-auto my-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                </div>
                <Editable value={field('leadershipSubtitle')} onChange={(v) => setField('leadershipSubtitle', v)} dir={dir}
                  placeholder={t('leadership.subtitle')} className={`text-gray-400 max-w-xl mx-auto text-sm md:text-base ${fontClass}`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaders.map((l) => (
                  <div key={l.id} className="group relative flex h-full flex-col items-center text-center rounded-3xl border border-gray-100 bg-rmc-green-light/40 px-6 py-9 shadow-[0_1px_2px_rgba(13,61,36,0.04),0_12px_32px_-18px_rgba(13,61,36,0.16)]">
                    <button onClick={() => removeLeader(l.id)} title="Remove leader"
                      className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative rounded-full bg-gradient-to-br from-rmc-green via-rmc-gold to-rmc-green p-[3px] shadow-md shadow-rmc-green/20">
                      <div className="relative w-28 h-28 rounded-full overflow-hidden ring-2 ring-white bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {l.image ? <img src={resolveImg(l.image)} alt={(l[nameKey] as string) || ''} className="w-full h-full object-cover object-top" /> : null}
                        <button onClick={() => setPhotoEditId(photoEditId === l.id ? null : l.id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition">
                          Edit photo
                        </button>
                      </div>
                    </div>
                    {photoEditId === l.id && (
                      <input autoFocus value={l.image} onChange={(e) => setLeader(l.id, 'image', e.target.value)} onBlur={() => setPhotoEditId(null)}
                        placeholder="Image URL or file key"
                        className="mt-3 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    )}
                    <Editable tag="h3" value={(l[nameKey] as string) || ''} onChange={(v) => setLeader(l.id, nameKey, v)} dir={dir}
                      placeholder="Name" className={`mt-5 font-bold text-gray-900 ${fontClass}`} />
                    <span aria-hidden className="my-3 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green" />
                    <Editable value={(l[roleKey] as string) || ''} onChange={(v) => setLeader(l.id, roleKey, v)} dir={dir}
                      placeholder="Role" className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-gold ${fontClass}`} />
                    {/* Profile — not on the public card; it appears when a
                        visitor opens this leader's pop-up. */}
                    <Editable value={(l[bioKey] as string) || ''} onChange={(v) => setLeader(l.id, bioKey, v)} dir={dir}
                      placeholder="Profile / bio (shown in the pop-up)"
                      className={`mt-3 whitespace-pre-line text-xs leading-relaxed text-gray-500 ${fontClass}`} />
                  </div>
                ))}
                <button onClick={addLeader}
                  className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-rmc-green/40 hover:text-rmc-green transition min-h-[240px]">
                  <Plus className="w-6 h-6" /><span className="text-sm font-semibold">Add leader</span>
                </button>
              </div>
            </div>
          </section>

          {/* 5. HISTORY TIMELINE — the real component (edit entries in Content → About) */}
          <HistoryTimeline locale={locale} />

          {/* 6. GALLERY PREVIEW */}
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <Editable tag="h2" value={field('galleryTitle')} onChange={(v) => setField('galleryTitle', v)} dir={dir}
                  placeholder={t('gallery.title')} className={`text-3xl md:text-4xl font-bold text-gray-900 inline-block ${fontClass}`} />
                <div className="ornament-divider max-w-xs mx-auto my-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                </div>
                <Editable value={field('gallerySubtitle')} onChange={(v) => setField('gallerySubtitle', v)} dir={dir}
                  placeholder={t('gallery.subtitle')} className={`text-gray-400 max-w-2xl mx-auto text-sm md:text-base ${fontClass}`} />
              </div>
              {gallery.length > 0 && (
                <div className="relative rounded-3xl overflow-hidden w-full max-w-4xl mx-auto min-h-[420px] md:min-h-[520px]">
                  <ImageCarousel3D images={gallery} />
                </div>
              )}
              <div className="mt-10 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
                  <Images className="w-4 h-4" /> {t('gallery.cta')} <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </section>
        </main>

        {/* Footer — visual only in the editor. */}
        <div className="pointer-events-none select-none">
          <Footer />
        </div>
      </div>

      {/* ============================ FLOATING EDITOR CONTROLS ============================ */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-gray-900/95 backdrop-blur text-white rounded-2xl shadow-2xl px-2.5 py-2">
        <Link href={`/${locale}/admin/content`} title="Back to Manage Content"
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-white/60 pr-1">
          <MousePointerClick className="w-3.5 h-3.5" /> Click text to edit
        </span>
        <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
          {LANGS.map((l) => (
            <button key={l.key} onClick={() => setLang(l.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${lang === l.key ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'}`}
              title={l.label}>
              {l.flag}
            </button>
          ))}
        </div>
        <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 transition-colors shrink-0">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button onClick={handleSave} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-rmc-green hover:bg-rmc-green-dark disabled:opacity-60 text-white text-sm font-semibold transition-colors shrink-0">
          {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <span className="sr-only">Editing {langLabel}</span>
    </div>
  );
}
