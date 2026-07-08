import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Bell } from 'lucide-react';
import { FuneralAnnouncementsClient } from '@/components/funeral/FuneralAnnouncementsClient';

export default async function FuneralAnnouncementsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.funeral.announcementsPage');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="bg-gray-50/60 pattern-light">
        {/* Header */}
        <section className="relative overflow-hidden bg-gradient-to-br from-rmc-green-deep via-slate-900 to-rmc-green-deep text-white">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-20" aria-hidden="true" />
          <div className="relative mx-auto max-w-5xl px-4 pt-28 pb-10 text-center sm:px-6">
            <div className="mb-4 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                <Bell className="h-6 w-6 text-rmc-gold-light" strokeWidth={1.75} aria-hidden="true" />
              </span>
            </div>
            <h1 className="text-2xl font-bold drop-shadow-lg md:text-3xl">{t('title')}</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/70">{t('subtitle')}</p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
          <Link
            href={`/${locale}/services/funeral`}
            className="mb-8 inline-flex items-center gap-1.5 rounded-full bg-rmc-green-deep px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rmc-green-dark"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {t('back')}
          </Link>
          <FuneralAnnouncementsClient locale={locale} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
