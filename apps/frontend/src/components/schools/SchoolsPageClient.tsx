'use client';

import { useTranslations } from 'next-intl';
import { GraduationCap, MapPin, Navigation } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/Reveal';
import { SchoolFinder } from './SchoolFinder';

export function SchoolsPageClient() {
  const t = useTranslations('schools');

  const features = [
    { Icon: MapPin, title: t('feature.locate.title'), text: t('feature.locate.text') },
    { Icon: GraduationCap, title: t('feature.levels.title'), text: t('feature.levels.text') },
    { Icon: Navigation, title: t('feature.directions.title'), text: t('feature.directions.text') },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} ornament />

        <section className="relative bg-transparent py-10 md:py-14">
          <div className="pointer-events-none absolute inset-0 pattern-light opacity-70" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {features.map(({ Icon, title, text }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-black/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green ring-1 ring-rmc-green/15">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <SchoolFinder />
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
