import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Moon,
  ArrowLeft,
  ArrowRight,
  FileText,
  HandHeart,
  ListChecks,
  Bell,
  Users,
  Landmark,
  LifeBuoy,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { FuneralActionCard } from '@/components/funeral/FuneralActionCard';
import { AnnouncementCard } from '@/components/funeral/AnnouncementCard';
import { HERO_AYAH } from '@/components/funeral/data';
import { funeralApi } from '@/lib/funeralApi';

type Tone = 'green' | 'gold' | 'slate';

export default async function FuneralServicesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.funeral');
  const base = `/${locale}/services/funeral`;
  const announcements = await funeralApi.listAnnouncements().catch(() => []);

  // Quick-action cards. Destinations that don't exist yet route to Contact so
  // families always reach the committee; built surfaces link to their route.
  const actions: { key: string; icon: LucideIcon; href: string; tone: Tone }[] = [
    { key: 'report', icon: FileText, href: `${base}/request`, tone: 'green' },
    { key: 'request', icon: HandHeart, href: `${base}/request`, tone: 'green' },
    { key: 'progress', icon: ListChecks, href: `${base}/status`, tone: 'slate' },
    { key: 'announcements', icon: Bell, href: `${base}/announcements`, tone: 'slate' },
    { key: 'volunteers', icon: Users, href: `${base}/volunteers`, tone: 'slate' },
    { key: 'cemetery', icon: Landmark, href: `${base}/cemeteries`, tone: 'slate' },
    { key: 'support', icon: LifeBuoy, href: `/${locale}/contact`, tone: 'green' },
  ];

  const annLabels = {
    age: t('landing.annLabels.age'),
    janazah: t('landing.annLabels.janazah'),
    prayer: t('landing.annLabels.prayer'),
    burial: t('landing.annLabels.burial'),
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-rmc-green-deep via-slate-900 to-rmc-green-deep text-white">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-20" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/50 to-transparent" aria-hidden="true" />

          <div className="relative mx-auto max-w-4xl px-4 pt-32 pb-14 text-center sm:px-6 lg:px-8">
            <div className="mb-5 flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                <Moon className="h-7 w-7 text-rmc-gold-light" strokeWidth={1.75} aria-hidden="true" />
              </span>
            </div>
            <p className="mb-2 font-arabic text-2xl leading-loose text-rmc-gold-light drop-shadow md:text-3xl" dir="rtl" lang="ar">
              {HERO_AYAH}
            </p>
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-white/50">
              {t('landing.ayahRef')}
            </p>
            <h1 className="mb-3 text-3xl font-bold drop-shadow-lg md:text-4xl">{t('title')}</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">{t('desc')}</p>

            <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Link
                href={`${base}/request`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-black/20 transition-all duration-300 hover:bg-rmc-green-dark"
              >
                {t('landing.ctaReport')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors duration-300 hover:bg-white/20"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> {t('landing.ctaContact')}
              </Link>
            </div>
          </div>

          <div className="relative px-4 pb-5 sm:px-6 lg:px-8">
            <Link
              href={`/${locale}/services`}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur transition-all hover:border-white/50 hover:bg-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" /> {t('landing.back')}
            </Link>
          </div>
        </section>

        {/* ── Quick actions + stats ── */}
        <section className="relative bg-transparent py-12">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 max-w-2xl">
              <h2 className="text-2xl font-bold text-gray-900">{t('landing.quickTitle')}</h2>
              <p className="mt-2 text-sm text-gray-500">{t('landing.quickSub')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {actions.map((a) => (
                <FuneralActionCard
                  key={a.key}
                  href={a.href}
                  icon={a.icon}
                  tone={a.tone}
                  title={t(`landing.actions.${a.key}.title`)}
                  desc={t(`landing.actions.${a.key}.desc`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Recent announcements ── */}
        <section id="announcements" className="scroll-mt-24 border-y border-rmc-green/10 bg-rmc-green/[0.03] py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-gray-900">{t('landing.announcementsTitle')}</h2>
                <p className="mt-2 text-sm text-gray-500">{t('landing.announcementsSub')}</p>
              </div>
              <Link
                href={`${base}/announcements`}
                className="inline-flex items-center gap-1.5 rounded-full border border-rmc-green/30 px-4 py-2 text-sm font-semibold text-rmc-green transition-colors hover:bg-rmc-green hover:text-white"
              >
                {t('landing.viewAll')} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {announcements.slice(0, 3).map((item) => (
                <AnnouncementCard key={item.id} item={item} labels={annLabels} locale={locale} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="relative overflow-hidden bg-rmc-green-deep py-14 text-center text-white">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-15" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-3 text-2xl font-bold">{t('landing.ctaTitle')}</h2>
            <p className="mb-7 text-sm leading-relaxed text-white/60">{t('landing.ctaSub')}</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`${base}/request`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-md shadow-black/20 transition-all duration-300 hover:bg-rmc-green-dark"
              >
                {t('landing.ctaReport')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white/20"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> {t('landing.ctaContact')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
