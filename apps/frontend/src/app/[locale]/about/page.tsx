import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { StatsSection } from '@/components/home/StatsSection';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import {
  Users, BookOpen, Star, Eye, CheckCircle2,
  Target, Building2, GraduationCap, Heart, DollarSign, Zap, UserRound,
} from 'lucide-react';

export default async function AboutPage() {
  const t = await getTranslations('about');

  // Core values (section 4)
  const values = [
    { key: 'unity', Icon: Users },
    { key: 'education', Icon: BookOpen },
    { key: 'service', Icon: Star },
    { key: 'transparency', Icon: Eye },
  ] as const;

  // Our story timeline entries (section 5)
  const timeline = ['e1', 'e2', 'e3', 'e4', 'e5'] as const;

  // Leadership roles (section 6)
  const leaders = ['m1', 'm2', 'm3', 'm4'] as const;

  // Programs & activities (section 7) — each area carries a description
  const programs = [
    { key: 'religious', Icon: Building2 },
    { key: 'education', Icon: GraduationCap },
    { key: 'social', Icon: Users },
    { key: 'finance', Icon: DollarSign },
    { key: 'health', Icon: Heart },
    { key: 'youth', Icon: Zap },
  ] as const;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>

        {/* ===================================================================
            1. HERO SECTION — full-bleed background image + headline
        =================================================================== */}
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

        {/* ===================================================================
            2. WHO WE ARE — intro + image with overlaid key facts
        =================================================================== */}
        <section className="py-20 px-4 bg-transparent overflow-hidden">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — image with stat badge */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
                <Image
                  src="https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large"
                  alt="RMC community gathering"
                  fill
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rmc-green-deep/60 to-transparent" />
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-rmc-green rounded-2xl flex flex-col items-center justify-center text-white shadow-xl shadow-rmc-green/30 rotate-3">
                <p className="text-2xl font-bold leading-none">25+</p>
                <p className="text-[10px] font-medium opacity-80 text-center leading-tight mt-0.5">Years of Service</p>
              </div>
            </div>

            {/* Right — text + checklist */}
            <div>
              <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-green" />
                {t('whoWeAre.badge')}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-5">
                {t('whoWeAre.heading')}{' '}
                <span className="text-rmc-green">{t('whoWeAre.headingHighlight')}</span>
              </h2>
              <p className="text-gray-500 leading-relaxed mb-4 text-sm md:text-base">{t('whoWeAre.p1')}</p>
              <p className="text-gray-500 leading-relaxed mb-7 text-sm md:text-base">{t('whoWeAre.p2')}</p>
              <div className="space-y-3">
                {(['point1', 'point2', 'point3', 'point4'] as const).map((p) => (
                  <div key={p} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-rmc-green shrink-0" />
                    <span className="text-gray-600 text-sm md:text-base">{t(`whoWeAre.${p}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            3. MISSION & VISION — two highlighted cards
        =================================================================== */}
        <section className="py-20 px-4 bg-gray-50/80 pattern-light">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
            <div className="group bg-rmc-green-light border-2 border-rmc-green/30 rounded-2xl p-8 shadow-md hover:shadow-xl hover:border-rmc-green/60 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-rmc-green text-white flex items-center justify-center mb-5 shadow-lg shadow-rmc-green/30 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-rmc-green mb-3">{t('mission.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('mission.text')}</p>
            </div>
            <div className="group bg-amber-50 border-2 border-rmc-gold/40 rounded-2xl p-8 shadow-md hover:shadow-xl hover:border-rmc-gold/70 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-rmc-gold text-white flex items-center justify-center mb-5 shadow-lg shadow-rmc-gold/30 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-amber-700 mb-3">{t('vision.title')}</h2>
              <p className="text-gray-700 leading-relaxed">{t('vision.text')}</p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            4. CORE VALUES — icon grid
        =================================================================== */}
        <section className="py-20 px-4 bg-transparent">
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

        {/* ===================================================================
            5. OUR STORY — vertical timeline of milestones
        =================================================================== */}
        <section className="py-20 px-4 bg-gray-50/80 pattern-light">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('story.title')}</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">{t('story.subtitle')}</p>
            </div>

            <div className="relative">
              {/* Center/left vertical line */}
              <div className="absolute left-4 md:left-1/2 top-2 bottom-2 w-px bg-gradient-to-b from-rmc-green/40 via-rmc-gold/40 to-rmc-green/40 md:-translate-x-1/2" />

              <div className="space-y-10">
                {timeline.map((id, i) => {
                  const isRight = i % 2 === 1; // alternate sides on desktop
                  return (
                    <div
                      key={id}
                      className={`relative flex md:items-center ${isRight ? 'md:flex-row-reverse' : ''}`}
                    >
                      {/* Timeline node */}
                      <div className="absolute left-4 md:left-1/2 w-3.5 h-3.5 rounded-full bg-rmc-green ring-4 ring-white shadow -translate-x-1/2 z-10" />

                      {/* Card */}
                      <div className={`ml-12 md:ml-0 md:w-1/2 ${isRight ? 'md:pl-10' : 'md:pr-10'}`}>
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-rmc-green/30 transition-all duration-300">
                          <span className="inline-block text-xs font-bold tracking-wide text-rmc-gold bg-rmc-gold/10 px-3 py-1 rounded-full mb-3">
                            {t(`story.${id}.year`)}
                          </span>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{t(`story.${id}.title`)}</h3>
                          <p className="text-gray-500 text-sm leading-relaxed">{t(`story.${id}.text`)}</p>
                        </div>
                      </div>

                      {/* Spacer for the empty side on desktop */}
                      <div className="hidden md:block md:w-1/2" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            6. LEADERSHIP — role cards
        =================================================================== */}
        <section className="py-20 px-4 bg-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('leadership.title')}</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">{t('leadership.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {leaders.map((id) => (
                <div
                  key={id}
                  className="group text-center p-6 rounded-2xl border border-gray-100 bg-white hover:border-rmc-green/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-deep flex items-center justify-center shadow-lg shadow-rmc-green/20">
                    <UserRound className="w-9 h-9 text-white/90" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{t(`leadership.${id}.role`)}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{t(`leadership.${id}.desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            7. PROGRAMS & ACTIVITIES — full-bleed background image + cards
        =================================================================== */}
        <section className="relative py-20 px-4 overflow-hidden">
          <Image
            src="https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large"
            alt="RMC community event"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-rmc-green-deep/90 to-black/80" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{t('programs.title')}</h2>
              <p className="text-white/50 max-w-2xl mx-auto">{t('programs.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map(({ key, Icon }) => (
                <div
                  key={key}
                  className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/25 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-rmc-gold/15 flex items-center justify-center shrink-0 group-hover:bg-rmc-gold/25 transition-colors">
                    <Icon className="w-5 h-5 text-rmc-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{t(`areas.${key}`)}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{t(`areas.${key}Desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            8. COMMUNITY IMPACT & STATISTICS — animated count-up cards
        =================================================================== */}
        <StatsSection />
      </main>

      {/* Footer (unchanged) */}
      <Footer />
    </div>
  );
}
