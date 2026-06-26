import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Heart, GraduationCap, Globe, ChevronRight, type LucideIcon } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { AreaDetail } from '@/components/areas/AreaDetail';
import {
  ContentKeys,
  AREAS_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  type AreasContent,
} from '@/lib/content-api';
import { fileUrl } from '@/lib/api';

const ICONS: Record<string, LucideIcon> = { BookOpen, Heart, GraduationCap, Globe };

// Default hero slides shared by PageHero (used when no hero image is set)
const DEFAULT_SLIDES = [
  'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
  'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
  'https://drive.google.com/thumbnail?id=1dNjgzd30RyYQ0_zCLFoqj83HjGh03bwq&sz=w1600',
];

// Always live — content changes from admin should reflect immediately
export const dynamic = 'force-dynamic';

export default async function AreaDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const { locale, slug } = params;

  const raw = await getSiteContent<AreasContent>(ContentKeys.areas).catch(() => null);
  const content: AreasContent = raw ? mergeContent(AREAS_DEFAULT, raw) : AREAS_DEFAULT;

  const item = content.items.find((a) => a.slug === slug);
  if (!item) notFound();

  const pillarIndex = content.items.indexOf(item) + 1;
  const title = pick(item.title, locale);
  const description = pick(item.description, locale);
  const otherAreas = content.items.filter((a) => a.slug !== slug);

  // Hero background: use the area's hero image + gallery images, fall back to default slides
  const heroImages: string[] = [];
  if (item.imageKey) heroImages.push(fileUrl(item.imageKey));
  if (item.galleryImages?.length) item.galleryImages.slice(0, 2).forEach((k) => heroImages.push(fileUrl(k)));
  const finalHeroImages = heroImages.length > 0 ? heroImages : DEFAULT_SLIDES;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — full-bleed photo background, pillar badge, title, description
      ═══════════════════════════════════════════════════════════════════ */}
      <PageHero
        eyebrow={`Pillar ${String(pillarIndex).padStart(2, '0')} · Areas of Intervention`}
        title={title}
        titleClassName="text-3xl md:text-4xl lg:text-5xl"
        subtitle={description}
        backHref={`/${locale}#areas`}
        backLabel="Back to Areas of Intervention"
        images={finalHeroImages}
        align="left"
        ornament={false}
        minHeightClassName="min-h-[58vh]"
        paddingClassName="pt-36 pb-16"
      />

      {/* ═══════════════════════════════════════════════════════════════════
          BREADCRUMB STRIP
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 h-11 text-[11px] text-gray-400" aria-label="Breadcrumb">
            <Link href={`/${locale}`} className="hover:text-rmc-green transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link href={`/${locale}#areas`} className="hover:text-rmc-green transition-colors">Areas of Intervention</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-gray-600 font-semibold">{title}</span>
          </nav>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BODY — two-column editorial layout
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="relative overflow-hidden">
        {/* Ambient background decoration */}
        <div aria-hidden className="absolute inset-0 pattern-light opacity-40 pointer-events-none" />
        <div aria-hidden className="absolute top-0 right-0 w-[520px] h-[520px] bg-rmc-green-light rounded-full -translate-y-1/2 translate-x-1/3 opacity-40 blur-[100px] pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 xl:gap-16">

            {/* ── Left: main content ── */}
            <div className="lg:col-span-2">
              <AreaDetail item={item} locale={locale} pillarIndex={pillarIndex} />
            </div>

            {/* ── Right: sticky sidebar ── */}
            <aside className="space-y-6 lg:pt-2">
              {/* Current area card */}
              <div className="rounded-3xl border border-rmc-green/10 bg-gradient-to-br from-rmc-green-light/60 to-white p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rmc-gold mb-3">Current Pillar</p>
                <div className="flex items-center gap-3 mb-4">
                  {item.imageKey ? (
                    <span className="w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-1 ring-rmc-gold/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl(item.imageKey)} alt={title} className="w-full h-full object-cover" />
                    </span>
                  ) : (
                    (() => { const Icon = ICONS[item.icon] ?? Globe; return (
                      <span className="grid place-items-center w-12 h-12 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shrink-0">
                        <Icon className="w-6 h-6" />
                      </span>
                    ); })()
                  )}
                  <div>
                    <p className="text-[10px] text-rmc-gold font-semibold uppercase tracking-wide">Pillar {String(pillarIndex).padStart(2, '0')}</p>
                    <p className="font-bold text-gray-900 text-sm">{title}</p>
                  </div>
                </div>
                <span className="block h-px w-full bg-gradient-to-r from-rmc-gold/30 to-transparent mb-4" />
                <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
              </div>

              {/* Other pillars */}
              {otherAreas.length > 0 && (
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400 mb-4">Other Pillars</p>
                  <div className="space-y-2">
                    {otherAreas.map((area, i) => {
                      const areaTitle = pick(area.title, locale);
                      const areaIndex = content.items.indexOf(area) + 1;
                      const AreaIcon = ICONS[area.icon] ?? Globe;
                      return (
                        <Link
                          key={area.slug}
                          href={`/${locale}/areas/${area.slug}`}
                          className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-rmc-green-light/60 transition-all duration-200"
                        >
                          {area.imageKey ? (
                            <span className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-1 ring-gray-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={fileUrl(area.imageKey)} alt={areaTitle} className="w-full h-full object-cover" />
                            </span>
                          ) : (
                            <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-rmc-green/80 to-rmc-green-dark/80 text-white shrink-0 group-hover:from-rmc-green group-hover:to-rmc-green-dark transition-all">
                              <AreaIcon className="w-4 h-4" />
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-rmc-gold font-semibold">Pillar {String(areaIndex).padStart(2, '0')}</p>
                            <p className="text-sm font-semibold text-gray-700 group-hover:text-rmc-green transition-colors truncate">{areaTitle}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-rmc-green group-hover:translate-x-0.5 transition-all shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Donate CTA */}
              <div className="rounded-3xl bg-gradient-to-br from-rmc-green to-rmc-green-dark p-6 text-white shadow-lg shadow-rmc-green/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rmc-gold/90">Support Our Work</p>
                </div>
                <p className="text-sm font-semibold leading-snug mb-4 text-white/90">Help us expand our {title} initiatives across Rwanda.</p>
                <Link
                  href={`/${locale}/donate`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-rmc-gold hover:bg-rmc-gold-light text-rmc-green-deep text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Donate Now →
                </Link>
              </div>
            </aside>
          </div>

          {/* ── Bottom: prev / next pillar navigation ── */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-between gap-4">
              {/* Prev */}
              {(() => {
                const prevItem = content.items[pillarIndex - 2];
                if (!prevItem) return <div />;
                const prevTitle = pick(prevItem.title, locale);
                return (
                  <Link href={`/${locale}/areas/${prevItem.slug}`} className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-rmc-green/20 hover:bg-rmc-green-light/30 transition-all max-w-[45%]">
                    <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-rmc-green group-hover:-translate-x-0.5 transition-all shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Previous</p>
                      <p className="text-sm font-semibold text-gray-700 group-hover:text-rmc-green transition-colors truncate">{prevTitle}</p>
                    </div>
                  </Link>
                );
              })()}

              {/* Next */}
              {(() => {
                const nextItem = content.items[pillarIndex];
                if (!nextItem) return <div />;
                const nextTitle = pick(nextItem.title, locale);
                return (
                  <Link href={`/${locale}/areas/${nextItem.slug}`} className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-rmc-green/20 hover:bg-rmc-green-light/30 transition-all max-w-[45%] text-right ml-auto">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Next</p>
                      <p className="text-sm font-semibold text-gray-700 group-hover:text-rmc-green transition-colors truncate">{nextTitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-rmc-green group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })()}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
