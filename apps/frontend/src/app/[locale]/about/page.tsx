import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import {
  Users, BookOpen, Star, Eye,
  Target, Building2, GraduationCap, Heart, DollarSign, Zap,
} from 'lucide-react';

export default async function AboutPage() {
  const t = await getTranslations('about');

  const values = [
    { key: 'unity', Icon: Users },
    { key: 'education', Icon: BookOpen },
    { key: 'service', Icon: Star },
    { key: 'transparency', Icon: Eye },
  ] as const;

  const areas = [
    { key: 'religious', Icon: Building2 },
    { key: 'education', Icon: GraduationCap },
    { key: 'social', Icon: Users },
    { key: 'finance', Icon: DollarSign },
    { key: 'health', Icon: Heart },
    { key: 'youth', Icon: Zap },
  ] as const;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Header */}
        <section className="relative text-white py-36 px-4 overflow-hidden min-h-[380px] flex items-center">
          <Image
            src="https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large"
            alt="RMC Community"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          <div className="absolute inset-0 pattern-islamic opacity-30" />
          <div className="relative max-w-4xl mx-auto text-center w-full">
            <div className="inline-flex items-center gap-2 bg-rmc-gold/20 border border-rmc-gold/30 text-rmc-gold px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold" />
              About RMC
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{t('title')}</h1>
            <p className="text-white/75 text-lg max-w-2xl mx-auto">{t('subtitle')}</p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
            <div className="group bg-rmc-green-light border border-rmc-green/10 rounded-2xl p-8 hover:shadow-lg hover:border-rmc-green/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-rmc-green/10 flex items-center justify-center mb-5 group-hover:bg-rmc-green/20 transition-colors">
                <Target className="w-6 h-6 text-rmc-green" />
              </div>
              <h2 className="text-xl font-bold text-rmc-green mb-3">{t('mission.title')}</h2>
              <p className="text-gray-600 leading-relaxed">{t('mission.text')}</p>
            </div>
            <div className="group bg-amber-50 border border-amber-100 rounded-2xl p-8 hover:shadow-lg hover:border-amber-300/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-rmc-gold/10 flex items-center justify-center mb-5 group-hover:bg-rmc-gold/20 transition-colors">
                <Eye className="w-6 h-6 text-rmc-gold" />
              </div>
              <h2 className="text-xl font-bold text-rmc-green mb-3">{t('vision.title')}</h2>
              <p className="text-gray-600 leading-relaxed">{t('vision.text')}</p>
            </div>
          </div>
        </section>

        {/* History */}
        <section className="py-16 px-4 bg-gray-50/80 pattern-light">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('history.title')}</h2>
            <p className="text-gray-600 leading-relaxed text-lg">{t('history.text')}</p>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">{t('values.title')}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {values.map(({ key, Icon }) => (
                <div
                  key={key}
                  className="group text-center p-6 rounded-2xl border border-gray-100 hover:border-rmc-green/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white"
                >
                  <div className="w-12 h-12 rounded-xl bg-rmc-green/8 flex items-center justify-center mx-auto mb-4 group-hover:bg-rmc-green/15 transition-colors">
                    <Icon className="w-5 h-5 text-rmc-green" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{t(`values.${key}`)}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{t(`values.${key}Desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Areas of Intervention */}
        <section className="relative py-20 px-4 overflow-hidden">
          <Image
            src="https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large"
            alt="RMC Community Event"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-rmc-green-deep/90 to-black/80" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">{t('areas.title')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {areas.map(({ key, Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/25 transition-all duration-200 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-rmc-gold/15 flex items-center justify-center shrink-0 group-hover:bg-rmc-gold/25 transition-colors">
                    <Icon className="w-4 h-4 text-rmc-gold" />
                  </div>
                  <span className="font-medium text-white/80 group-hover:text-white transition-colors">{t(`areas.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
