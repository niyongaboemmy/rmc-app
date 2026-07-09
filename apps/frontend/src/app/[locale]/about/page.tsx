import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { ImageCarousel3D } from '@/components/about/ImageCarousel3D';
import { HistoryTimeline } from '@/components/about/HistoryTimeline';
import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, Images, Mail, Phone } from 'lucide-react';
import { publicApi } from '@/lib/public-api';
import { ContentKeys, getSiteContent, pickLang } from '@/lib/content-api';
import DOMPurify from 'isomorphic-dompurify';

const FILE_SERVER = process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';
const fileUrl = (key: string) => `${FILE_SERVER}/api/v1/files/${key}`;

// Always fetch fresh so newly uploaded gallery images appear without a rebuild.
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const t = await getTranslations('about');
  const locale = await getLocale();

  // Admin-editable content (CMS). Falls back to the i18n defaults when a field
  // hasn't been set in the dashboard, so the page looks identical until edited.
  const about = await getSiteContent<Record<string, unknown>>(ContentKeys.about).catch(() => null);
  const cms = (base: string) => (about ? pickLang(about, base, locale).trim() : '');
  const txt = (base: string, fallback: string) => cms(base) || fallback;
  const historyText = cms('history');
  const missionText = cms('mission');
  const visionText = cms('vision');
  // Rich-text fields hold HTML; an empty editor yields "<p></p>", so check for
  // actual text before preferring CMS content over the i18n fallback.
  const hasText = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim().length > 0;
  // Defense-in-depth: sanitize admin-entered HTML before rendering.
  const clean = (html: string) => DOMPurify.sanitize(html);
  const proseCls = 'prose prose-sm md:prose-base max-w-none prose-headings:text-gray-900 prose-a:text-rmc-green prose-strong:text-gray-900 prose-blockquote:border-rmc-gold';

  // Leadership — fallback portraits/roles when none are set in the CMS yet.
  const leaders = [
    { id: 'm1', img: 'https://i.postimg.cc/8CKkfkMS/Mufti.jpg' },
    { id: 'm2', img: 'https://i.postimg.cc/mkTL1ckm/V1A8567.jpg' },
    { id: 'm3', img: 'https://i.postimg.cc/9f1JHK96/Qadh.jpg' },
    { id: 'm4', img: 'https://i.postimg.cc/Cx0M5wJm/P1180223.jpg' },
    { id: 'm5', img: 'https://i.postimg.cc/Fsym22m4/P1180220.jpg' },
    { id: 'm6', img: 'https://i.postimg.cc/YSxyqhck/ES-Salim.jpg' },
  ] as const;

  // Admin-managed leaders take over once saved; otherwise use the fallback above.
  const cmsLeaders = Array.isArray(about?.leaders) ? (about!.leaders as Array<Record<string, string>>) : [];
  const resolveLeaderImg = (v: string) => (/^https?:\/\//.test(v) || v.startsWith('/') ? v : fileUrl(v));
  const leaderList = cmsLeaders.length > 0
    ? cmsLeaders.map((l) => ({ id: l.id, img: resolveLeaderImg(l.image || ''), name: pickLang(l, 'name', locale), role: pickLang(l, 'role', locale), email: l.email || '', phone: l.phone || '' }))
    : leaders.map((l) => ({ id: l.id, img: l.img as string, name: t(`leadership.${l.id}.name`), role: t(`leadership.${l.id}.role`), email: '', phone: '' }));

  // Gallery preview 3D carousel — pulled from the public gallery API.
  const galleryImages = await publicApi
    .getGallery(undefined, 1)
    .then((res) =>
      res.data.map((g) => ({
        src: fileUrl(g.mediumKey ?? g.fileKey),
        alt: g.title ?? t('gallery.title'),
      })),
    )
    .catch(() => [] as { src: string; alt: string }[]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>

        {/* ===================================================================
            1. HERO SECTION — animated community-photo background
        =================================================================== */}
        <PageHero
          eyebrow="About RMC"
          title={txt('title', t('title'))}
          subtitle={txt('subtitle', t('subtitle'))}
          ornament
        />

        {/* ===================================================================
            2. WHO WE ARE — intro + image with overlaid key facts
        =================================================================== */}
        <section className="relative bg-transparent py-24 md:py-32 overflow-hidden">
          {/* Faint Islamic geometric texture — echoes the home Who We Are */}
          <div aria-hidden className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
          {/* Soft ambient light wash */}
          <div aria-hidden className="absolute top-0 right-0 w-[520px] h-[520px] bg-rmc-green-light rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-[90px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header — centered */}
            <div className="max-w-7xl mx-auto text-center">
              <div className="inline-flex items-center gap-2.5 mb-6 px-4 py-1.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 backdrop-blur-sm text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-rmc-green-dark">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                {t('whoWeAre.badge')}
              </div>

              <h2 className="text-3xl md:text-[2.6rem] font-bold text-gray-900 leading-[1.15] tracking-tight mb-5">
                {txt('whoWeAreHeading', t('whoWeAre.heading'))}{' '}
                <span className="text-rmc-green">{txt('whoWeAreHighlight', t('whoWeAre.headingHighlight'))}</span>
              </h2>

              {/* Arabic verse framed by gold ornament — mirrors the home centerpiece */}
              <div className="ornament-divider max-w-md mx-auto mb-3">
                <p className="font-arabic text-rmc-green-dark text-lg md:text-xl leading-loose text-center px-2" dir="rtl">
                  {txt('verse', 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا')}
                </p>
              </div>
              <p className="text-rmc-gold text-[11px] font-semibold tracking-wide mb-10">
                {txt('verseRef', '“Hold firmly to the rope of Allah, all together” — Aal-Imran 3:103')}
              </p>
            </div>

            {/* Narrative — left-aligned, spanning the full section width */}
            <div className="max-w-7xl mx-auto space-y-4 text-gray-500 leading-relaxed text-sm md:text-base">
              {hasText(historyText)
                ? <div className={`${proseCls} text-gray-500`} dangerouslySetInnerHTML={{ __html: clean(historyText) }} />
                : (<>
                    <p>{t('whoWeAre.p1')}</p>
                    <p>{t('whoWeAre.p2')}</p>
                    <p>{t('whoWeAre.p3')}</p>
                  </>)}
            </div>
          </div>
        </section>

        {/* ===================================================================
            3. MISSION / VISION / VALUES — paired cards + values grid
        =================================================================== */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-7xl mx-auto">
            {/* Mission & Vision — transparent, borderless; constrained to the Who We Are width */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="flex flex-col justify-start p-8 md:p-10">
                <h2 className="text-2xl font-bold tracking-tight text-rmc-green mb-7">
                  <span className="relative inline-block pb-2">
                    {txt('missionTitle', t('mission.title'))}
                    <span aria-hidden className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green" />
                  </span>
                </h2>
                {hasText(missionText) ? (
                  <div className={`${proseCls} text-gray-600`} dangerouslySetInnerHTML={{ __html: clean(missionText) }} />
                ) : (
                  <ul className="space-y-4">
                    {(['i1'] as const).map((i) => (
                      <li key={i} className="text-gray-600 leading-relaxed">
                        <span className="font-semibold text-gray-900">{t(`mission.items.${i}.label`)}: </span>
                        {t(`mission.items.${i}.text`)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col justify-start p-8 md:p-10">
                <h2 className="text-2xl font-bold tracking-tight text-rmc-gold mb-7">
                  <span className="relative inline-block pb-2">
                    {txt('visionTitle', t('vision.title'))}
                    <span aria-hidden className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green" />
                  </span>
                </h2>
                {hasText(visionText) ? (
                  <div className={`${proseCls} text-gray-600`} dangerouslySetInnerHTML={{ __html: clean(visionText) }} />
                ) : (
                  <ul className="space-y-4">
                    {(['i1', 'i2'] as const).map((i) => (
                      <li key={i} className="text-gray-600 leading-relaxed">
                        <span className="font-semibold text-gray-900">{t(`vision.items.${i}.label`)}: </span>
                        {t(`vision.items.${i}.text`)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ===================================================================
            4. LEADERSHIP — role cards
        =================================================================== */}
        <section className="relative py-20 bg-transparent overflow-hidden">
          {/* Ambient backdrop — mirrors the Who We Are section */}
          <div aria-hidden className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
          <div aria-hidden className="absolute top-0 left-0 w-[480px] h-[480px] bg-rmc-green-light rounded-full -translate-y-1/2 -translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 translate-x-1/3 blur-[90px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{txt('leadershipTitle', t('leadership.title'))}</h2>
              <div className="ornament-divider max-w-xs mx-auto my-4">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
              </div>
              <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">{txt('leadershipSubtitle', t('leadership.subtitle'))}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {leaderList.map(({ id, img, name, role, email, phone }) => (
                <div
                  key={id}
                  className="group relative flex h-full flex-col items-center text-center rounded-3xl border border-gray-100 bg-rmc-green-light/40 px-6 py-9 shadow-[0_1px_2px_rgba(13,61,36,0.04),0_12px_32px_-18px_rgba(13,61,36,0.16)] transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none hover:-translate-y-2 hover:border-rmc-green/30 hover:shadow-[0_28px_60px_-24px_rgba(26,122,74,0.28)]"
                >
                  {/* Soft glow that blooms on hover */}
                  <div aria-hidden className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full bg-rmc-green/[0.06] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Portrait — gradient green→gold ring frame */}
                  <div className="relative rounded-full bg-gradient-to-br from-rmc-green via-rmc-gold to-rmc-green p-[3px] shadow-md shadow-rmc-green/20">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden ring-2 ring-white">
                      <Image
                        src={img}
                        alt={name}
                        fill
                        quality={95}
                        sizes="(max-width: 640px) 112px, 128px"
                        className="object-cover object-top transition-transform duration-500 motion-reduce:transform-none group-hover:scale-105"
                      />
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="mt-5 font-bold text-gray-900 transition-colors duration-200 group-hover:text-rmc-green">
                    {name}
                  </h3>

                  {/* Gradient hairline divider — matches the Mission/Vision underline */}
                  <span aria-hidden className="my-3 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-green via-rmc-gold to-rmc-green" />

                  {/* Title / role */}
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-gold">
                    {role}
                  </p>

                  {/* Contact — email & phone */}
                  {(email || phone) && (
                    <div className="mt-4 flex flex-col items-center gap-1.5 text-xs text-gray-500">
                      {email && (
                        <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:text-rmc-green transition-colors">
                          <Mail className="w-3.5 h-3.5 text-rmc-green/70" /> {email}
                        </a>
                      )}
                      {phone && (
                        <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-rmc-green transition-colors" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-rmc-green/70" /> {phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            5. HISTORY TIMELINE
        =================================================================== */}
        <HistoryTimeline locale={locale} />

        {/* ===================================================================
            6. GALLERY PREVIEW — 3D carousel + link to full gallery
        =================================================================== */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{txt('galleryTitle', t('gallery.title'))}</h2>
              <div className="ornament-divider max-w-xs mx-auto my-4">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
              </div>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">{txt('gallerySubtitle', t('gallery.subtitle'))}</p>
            </div>

            {galleryImages.length > 0 && (
              <div className="relative rounded-3xl overflow-hidden w-full max-w-4xl mx-auto min-h-[420px] md:min-h-[520px]">
                <ImageCarousel3D images={galleryImages} />
              </div>
            )}

            <div className="mt-10 text-center">
              <Link
                href={`/${locale}/gallery`}
                className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30 transition-all duration-300 hover:bg-rmc-green-dark hover:-translate-y-0.5"
              >
                <Images className="w-4 h-4" />
                {t('gallery.cta')}
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (unchanged) */}
      <Footer />
    </div>
  );
}
