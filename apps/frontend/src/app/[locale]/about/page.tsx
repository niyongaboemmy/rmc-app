import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { ImageCarousel3D } from '@/components/about/ImageCarousel3D';
import { HistoryTimeline } from '@/components/about/HistoryTimeline';
import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, Eye, Images, Mail, Phone, Target, User } from 'lucide-react';
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
  // Mission/Vision cards: same prose, but bold lead-in labels render in gold
  // (the CMS wraps them in <strong>, so this is what actually colors them —
  // the i18n-fallback spans are only used when the CMS field is empty).
  const cardProseCls = 'prose prose-sm md:prose-base max-w-none prose-headings:text-gray-900 prose-a:text-rmc-green prose-strong:text-rmc-gold prose-blockquote:border-rmc-gold';

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
    ? cmsLeaders.map((l) => ({ id: l.id, img: l.image ? resolveLeaderImg(l.image) : '', name: pickLang(l, 'name', locale), role: pickLang(l, 'role', locale), email: l.email || '', phone: l.phone || '' }))
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
          title={txt('title', t('title'))}
          subtitle={txt('subtitle', t('subtitle'))}
          paddingClassName="pt-28 pb-10"
          minHeightClassName="min-h-[40vh]"
        />

        {/* ===================================================================
            2. WHO WE ARE — intro + image with overlaid key facts
        =================================================================== */}
        <section className="relative bg-transparent py-12 overflow-hidden">
          {/* Faint Islamic geometric texture — echoes the home Who We Are */}
          <div aria-hidden className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
          {/* Soft ambient light wash */}
          <div aria-hidden className="absolute top-0 right-0 w-[520px] h-[520px] bg-rmc-green-light rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-[90px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header — centered */}
            <div className="max-w-7xl mx-auto text-center">
              <h2 className="text-3xl md:text-[2.6rem] font-medium text-rmc-green-deep leading-[1.15] tracking-tight mb-5">
                {txt('whoWeAreHeading', t('whoWeAre.heading'))}{' '}
                <span className="text-rmc-green">{txt('whoWeAreHighlight', t('whoWeAre.headingHighlight'))}</span>
              </h2>

              {/* Arabic verse framed by gold ornament — mirrors the home centerpiece */}
              <div className="ornament-divider max-w-md mx-auto mb-3">
                <p className="font-arabic text-rmc-green-dark text-lg md:text-xl leading-loose text-center px-2" dir="rtl">
                  {txt('verse', 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا')}
                </p>
              </div>
              <p className="text-rmc-gold text-[11px] font-semibold tracking-wide mb-6">
                {txt('verseRef', '“Hold firmly to the rope of Allah, all together” — Aal-Imran 3:103')}
              </p>
            </div>

            {/* Narrative — left-aligned in a centered reading container with a
                little extra horizontal padding for comfortable line length. */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4 text-gray-500 leading-relaxed text-sm md:text-base">
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
            {/* Mission & Vision — matched cards. Mission on a soft light card,
                Vision on the deep-green card, each with an icon medallion, a
                centered heading and a short blurb. Both carry a subtle ring +
                shadow so they read as a matched pair with equal visual weight. */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Mission — light card */}
              <div className="flex flex-col rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-6 shadow-sm ring-1 ring-gray-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:p-7">
                <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-rmc-green/10 text-rmc-green ring-1 ring-rmc-green/15">
                  <Target className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h2 className="text-center text-2xl font-medium tracking-tight text-gray-900">
                  {txt('missionTitle', t('mission.title'))}
                </h2>
                {hasText(missionText) ? (
                  <div className={`${proseCls} mt-3 text-gray-500`} dangerouslySetInnerHTML={{ __html: clean(missionText) }} />
                ) : (
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-gray-500">
                    {(['i1'] as const).map((i) => (
                      <p key={i}>
                        <span className="font-medium text-gray-900">{t(`mission.items.${i}.label`)}: </span>
                        {t(`mission.items.${i}.text`)}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Vision — deep-green card */}
              <div className="flex flex-col rounded-lg bg-rmc-green-deep p-6 text-white shadow-lg shadow-rmc-green/20 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-7">
                <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-rmc-gold/15 text-rmc-gold ring-1 ring-rmc-gold/25">
                  <Eye className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h2 className="text-center text-2xl font-medium tracking-tight text-white">
                  {txt('visionTitle', t('vision.title'))}
                </h2>
                {hasText(visionText) ? (
                  <div className={`${cardProseCls} prose-invert mt-3 text-white/70`} dangerouslySetInnerHTML={{ __html: clean(visionText) }} />
                ) : (
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-white/70">
                    {(['i1', 'i2'] as const).map((i) => (
                      <p key={i}>
                        <span className="font-medium text-rmc-gold">{t(`vision.items.${i}.label`)}: </span>
                        {t(`vision.items.${i}.text`)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ===================================================================
            4. LEADERSHIP — role cards
        =================================================================== */}
        <section className="relative py-12 bg-transparent overflow-hidden">
          {/* Ambient backdrop — mirrors the Who We Are section */}
          <div aria-hidden className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
          <div aria-hidden className="absolute top-0 left-0 w-[480px] h-[480px] bg-rmc-green-light rounded-full -translate-y-1/2 -translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 translate-x-1/3 blur-[90px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-medium text-rmc-green-deep">{txt('leadershipTitle', t('leadership.title'))}</h2>
              <div className="ornament-divider mx-auto my-4 max-w-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
              </div>
              <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">{txt('leadershipSubtitle', t('leadership.subtitle'))}</p>
            </div>
            <div className="mx-auto grid max-w-4xl grid-cols-1 md:grid-cols-2 gap-5">
              {leaderList.map(({ id, img, name, role, email, phone }) => (
                <div
                  key={id}
                  className="group flex items-center gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:shadow-md"
                >
                  {/* Portrait — gradient green→gold ring frame; dark-green head
                      placeholder when a leader has no photo set. */}
                  <div className="relative shrink-0 rounded-full bg-gradient-to-br from-rmc-green via-rmc-gold to-rmc-green p-[2px] shadow-sm shadow-rmc-green/20">
                    <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-white">
                      {img ? (
                        <Image
                          src={img}
                          alt={name}
                          fill
                          quality={95}
                          sizes="80px"
                          className="object-cover object-top transition-transform duration-500 motion-reduce:transform-none group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-rmc-green-deep">
                          <User className="h-9 w-9 text-white/80" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    {/* Role pill */}
                    <span className="inline-flex items-center rounded-lg bg-rmc-green-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rmc-green-dark">
                      {role}
                    </span>

                    {/* Name + verified check */}
                    <h3 className="mt-2 truncate font-medium text-gray-900">
                      {name}
                    </h3>

                    {/* Contact — email & phone */}
                    {(email || phone) && (
                      <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                        {email && (
                          <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 truncate hover:text-rmc-green transition-colors">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" /> <span className="truncate">{email}</span>
                          </a>
                        )}
                        {phone && (
                          <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-rmc-green transition-colors" dir="ltr">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" /> {phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
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
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-medium text-rmc-green-deep">{txt('galleryTitle', t('gallery.title'))}</h2>
              <div className="ornament-divider mx-auto my-4 max-w-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
              </div>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">{txt('gallerySubtitle', t('gallery.subtitle'))}</p>
            </div>

            {galleryImages.length > 0 && (
              <div className="relative rounded-lg overflow-hidden w-full max-w-2xl mx-auto min-h-[320px] md:min-h-[400px]">
                <ImageCarousel3D images={galleryImages} />
              </div>
            )}

            <div className="mt-10 text-center">
              <Link
                href={`/${locale}/gallery`}
                className="inline-flex items-center gap-2 rounded-lg bg-rmc-green-deep px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30 transition-all duration-300 hover:bg-rmc-green-dark hover:-translate-y-0.5"
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
