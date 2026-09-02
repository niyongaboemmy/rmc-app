'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Building2, CheckCircle2, ChevronRight, HandHeart, Loader2, MapPin, Target, TrendingUp, Wallet, ZoomIn,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { PageHero } from '@/components/layout/PageHero';
import { GalleryLightbox } from '@/components/gallery/GalleryLightbox';
import { Footer } from '@/components/layout/Footer';
import { fileUrl } from '@/lib/api';
import {
  ContentKeys,
  PROJECTS_DEFAULT,
  pick,
  isRtl,
  projectPct,
  projectMoney,
  type ProjectsContent,
  type ProjectItem,
} from '@/lib/content-api';
import { usePreviewableContentState } from '@/lib/content/preview-store';

function resolveImg(v?: string): string {
  if (!v) return '';
  return /^https?:\/\//.test(v) || v.startsWith('/') ? v : fileUrl(v);
}

/** Plain text → paragraphs (blank line = new paragraph); preserves single newlines. */
function Prose({ text }: { text: string }) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 0) return null;
  return (
    <div className="space-y-4">
      {paras.map((p, i) => (
        <p key={i} className="whitespace-pre-line text-[15px] leading-relaxed text-gray-600">{p}</p>
      ))}
    </div>
  );
}

export function ProjectDetailClient({ slug }: { slug: string }) {
  const { locale } = useParams<{ locale: string }>();
  const rtl = isRtl(locale);
  const arFont = rtl ? 'font-arabic' : '';
  /** Which gallery photo is open full-size; null when the lightbox is closed. */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // The page reads this section on the server, so the project resolves on the first
  // render and its copy is in the HTML rather than appearing after the spinner.
  // Without a provider this falls back to fetching on mount.
  const { content, ready: loaded } = usePreviewableContentState<ProjectsContent>(
    ContentKeys.projects,
    PROJECTS_DEFAULT,
  );
  const project: ProjectItem | null = content.items.find((p) => p.slug === slug) ?? null;

  // ── Loading ──
  if (!loaded) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar />
        <div className="flex flex-1 items-center justify-center py-40">
          <Loader2 className="h-7 w-7 animate-spin text-rmc-green" />
        </div>
        <Footer />
      </div>
    );
  }

  // ── Not found ──
  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-40 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100">
            <Building2 className="h-7 w-7 text-gray-300" />
          </span>
          <p className="text-lg font-bold text-gray-800">Project not found</p>
          <p className="mt-1 text-sm text-gray-500">This project may have been removed or the link is incorrect.</p>
          <Link href={`/${locale}/projects`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-rmc-green px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rmc-green-dark">
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const title = pick(project.title, locale);
  const summary = pick(project.summary, locale);
  const description = pick(project.description, locale);
  const whatWeNeed = project.whatWeNeed ? pick(project.whatWeNeed, locale) : '';
  const pct = projectPct(project.fundCollected, project.fundNeeded);
  const funded = pct >= 100;
  const done = project.status === 'completed';
  const remaining = Math.max(0, project.fundNeeded - project.fundCollected);
  const cover = resolveImg(project.imageKey);
  const gallery = (project.galleryImages ?? []).map(resolveImg).filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* The shared hero, as the projects LISTING already uses.
          This page hand-rolled its own: its own image layer, its own overlays, its
          own back link, at min-h-[54vh] where every other hero on the site is 40.
          Two implementations of one thing, and only one of them got fixes.

          `images={cover ? [cover] : []}` — an empty array renders no image layer,
          leaving the green ground and overlays, which is what a project with no
          cover showed before. Passing `undefined` would fall through to PageHero's
          default slides, putting stock photography on a project that has none. */}
      <PageHero
        images={cover ? [cover] : []}
        align="left"
        minHeightClassName="min-h-[40vh]"
        paddingClassName="pt-36 pb-10"
        backHref={`/${locale}/projects`}
        backLabel={pick({ en: 'Back to Projects', rw: 'Subira ku Mishinga', ar: 'العودة إلى المشاريع' }, locale)}
        titleClassName="text-3xl md:text-5xl"
        title={<span dir={rtl ? 'rtl' : 'ltr'} className={arFont}>{title}</span>}
      >
        {/* Badges and location sit BELOW the title now, where they were above it.
            PageHero's only slot above the title is `eyebrow`, which wraps whatever
            it is given in a single bordered pill — right for one word, wrong for two
            separate badges. One metadata row under the title reads cleanly and does
            not fight the component. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {project.category && (
            <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-rmc-green-deep">
              {project.category}
            </span>
          )}
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rmc-green px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-white">
              <CheckCircle2 className="h-3 w-3" /> {pick({ en: 'Completed', rw: 'Byarangiye', ar: 'مكتمل' }, locale)}
            </span>
          )}
          {project.location && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80">
              <MapPin className="h-4 w-4 text-rmc-gold-light" /> {project.location}
            </span>
          )}
        </div>
      </PageHero>

      {/* Breadcrumb */}
      {/* Offset by the navbar's own height (h-14 / md:h-16), not top-0.
          The site nav is `fixed top-0 z-50`, so pinning this at 0 parked it
          underneath — and z-20 against z-50 meant it was hidden at exactly the
          moment it became sticky. */}
      <div className="sticky top-14 z-20 border-b border-gray-100 bg-white/85 backdrop-blur-sm md:top-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex h-11 items-center gap-1.5 text-[11px] text-gray-400" aria-label="Breadcrumb">
            <Link href={`/${locale}`} className="transition-colors hover:text-rmc-green">
                {pick({ en: 'Home', rw: 'Ahabanza', ar: 'الرئيسية' }, locale)}
              </Link>
            <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180" />
            <Link href={`/${locale}/projects`} className="transition-colors hover:text-rmc-green">
                {pick({ en: 'Projects', rw: 'Imishinga', ar: 'المشاريع' }, locale)}
              </Link>
            <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180" />
            <span className="truncate font-semibold text-gray-600">{title}</span>
          </nav>
        </div>
      </div>

      {/* Body */}
      <main className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 pattern-light opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 xl:gap-14">
            {/* ── Left ── */}
            <div className="lg:col-span-2">
              {summary && (
                <p className={`mb-8 border-l-2 border-rmc-gold pl-4 text-lg font-medium leading-relaxed text-gray-700 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                  {summary}
                </p>
              )}

              <h2 className="mb-4 text-lg font-bold text-gray-900">{pick({ en: 'About this project', rw: 'Ibyerekeye uyu mushinga', ar: 'عن هذا المشروع' }, locale)}</h2>
              <Prose text={description} />

              {whatWeNeed && (
                <div className="mt-9">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                    <Target className="h-5 w-5 text-rmc-green" />
                    {pick({ en: 'What we need', rw: 'Icyo dukeneye', ar: 'ما نحتاج إليه' }, locale)}
                  </h2>
                  <div className="rounded-lg border border-rmc-green/15 bg-rmc-green-light/40 p-5">
                    <Prose text={whatWeNeed} />
                  </div>
                </div>
              )}

              {gallery.length > 0 && (
                <div className="mt-9">
                  <h2 className="mb-4 text-lg font-bold text-gray-900">{pick({ en: 'Gallery', rw: 'Amafoto', ar: 'المعرض' }, locale)}</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.map((src, i) => (
                      /* A button, not a div with a click handler: opening a photo is an
                         action, so it should be reachable by keyboard and announced as
                         something that does one. */
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxIndex(i)}
                        aria-label={pick({ en: 'Open image', rw: 'Fungura ifoto', ar: 'افتح الصورة' }, locale)}
                        className="group relative aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-green focus-visible:ring-offset-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`${title} — ${i + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        {/* Says the tile does something. The slow zoom alone read as
                            decoration rather than an affordance. */}
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:bg-black/25 group-hover:opacity-100 group-focus-visible:bg-black/25 group-focus-visible:opacity-100">
                          <ZoomIn className="h-6 w-6 text-white drop-shadow" aria-hidden />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: sticky funding ── */}
            <aside className="lg:pt-1">
              <div className="space-y-4 lg:sticky lg:top-20">
                <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
                  <div className="p-6">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-rmc-gold">{pick({ en: 'Funding progress', rw: 'Aho ikusanya rigeze', ar: 'تقدّم التمويل' }, locale)}</p>

                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-extrabold tabular-nums text-gray-900">{projectMoney(project.currency, project.fundCollected)}</span>
                      <span className={`inline-flex items-center gap-1 text-base font-extrabold tabular-nums ${funded ? 'text-[#8A6A0F]' : 'text-rmc-green'}`}>
                        {funded && <CheckCircle2 className="h-4 w-4" />}{pct}%
                      </span>
                    </div>
                    <p className="mb-4 text-xs text-gray-400">
                      {pick({ en: 'raised of', rw: 'byakusanyijwe kuri', ar: 'من أصل' }, locale)}{' '}
                      <span className="font-semibold text-gray-600">{projectMoney(project.currency, project.fundNeeded)}</span>{' '}
                      {pick({ en: 'goal', rw: 'intego', ar: 'هدف' }, locale)}
                    </p>

                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${funded ? 'bg-gradient-to-r from-rmc-gold to-rmc-gold-light' : 'bg-gradient-to-r from-rmc-green to-rmc-green-dark'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-rmc-green/15 bg-rmc-green-light/50 p-3">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rmc-green-dark">
                          <TrendingUp className="h-3.5 w-3.5 shrink-0" /> {pick({ en: 'Raised', rw: 'Byakusanyijwe', ar: 'تم جمعه' }, locale)}
                        </span>
                        <p className="mt-1 text-sm font-bold leading-none tabular-nums text-gray-900">{projectMoney(project.currency, project.fundCollected)}</p>
                      </div>
                      <div className="rounded-md border border-rmc-gold/20 bg-rmc-gold/10 p-3">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A6A0F]">
                          <Wallet className="h-3.5 w-3.5 shrink-0" /> {pick({ en: 'Still needed', rw: 'Bikenewe', ar: 'المتبقي' }, locale)}
                        </span>
                        <p className="mt-1 text-sm font-bold leading-none tabular-nums text-gray-900">{projectMoney(project.currency, remaining)}</p>
                      </div>
                    </div>

                    {!funded ? (
                      <Link href={`/${locale}/donate`} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-rmc-green px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-rmc-green-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-green focus-visible:ring-offset-2 active:scale-[0.98]">
                        <HandHeart className="h-4 w-4" /> {pick({ en: 'Support this project', rw: 'Shyigikira uyu mushinga', ar: 'ادعم هذا المشروع' }, locale)}
                      </Link>
                    ) : (
                      <p className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-rmc-green-light/70 px-5 py-3 text-sm font-bold text-rmc-green-dark">
                        <CheckCircle2 className="h-4 w-4" /> {pick({ en: 'Fully funded — Alhamdulillah', rw: 'Byuzuye — Alhamdulillah', ar: 'تم التمويل بالكامل — الحمد لله' }, locale)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* The shared lightbox — keyboard nav, swipe, backdrop dismiss and
          scroll-lock all come with it. Mounted only while open, so a closed
          gallery costs nothing. */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          images={gallery.map((src, i) => ({ src, alt: `${title} — ${i + 1}` }))}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <Footer />
    </div>
  );
}
