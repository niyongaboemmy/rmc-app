import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';
import { HeroBackLink } from '@/components/services/HeroBackLink';
import { GoodConductStatusChecker } from '@/components/services/GoodConductStatusChecker';

export default async function GoodConductStatusPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.conduct.status');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <section className="relative text-white min-h-[34vh] py-10 px-4 sm:px-6 lg:px-8 overflow-hidden flex items-center">
          <Image
            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-indigo-950/70 to-black/55" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />
          <div className="relative max-w-4xl mx-auto text-center w-full">
            <div className="flex justify-center mb-4 pt-24">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg ring-1 ring-white/20">
                <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.25} />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">{t('title')}</h1>
            <p className="text-white/75 text-base max-w-2xl mx-auto">{t('subtitle')}</p>
          </div>

          <HeroBackLink href={`/${locale}/services/conduct`} label={t('backToService')} />
        </section>

        <section className="bg-gray-50/60 pattern-light">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
            <Suspense>
              <GoodConductStatusChecker />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
