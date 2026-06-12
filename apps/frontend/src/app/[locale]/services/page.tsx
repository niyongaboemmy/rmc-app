import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Heart, FileText, ClipboardList, GraduationCap, Home, Briefcase, ArrowRight, ScrollText } from 'lucide-react';

/**
 * Per-service theme. Each service owns a distinct colour family so the grid
 * reads as a set of clearly-separated cards (visible borders, tinted
 * backgrounds, gradient icon tiles) rather than a wall of identical white boxes.
 * Class strings are fully spelled out so Tailwind's JIT can detect them.
 */
const services = [
  {
    key: 'marriage', slug: 'marriage', Icon: Heart,
    card: 'bg-gradient-to-br from-rose-50 to-white border-rose-200 hover:border-rose-400',
    iconTile: 'bg-gradient-to-br from-rose-600 to-rose-800 shadow-rose-900/25',
    accent: 'text-rose-700', accentHover: 'group-hover:text-rose-700',
  },
  {
    key: 'funeral', slug: 'funeral', Icon: ScrollText,
    card: 'bg-gradient-to-br from-slate-100 to-white border-slate-300 hover:border-slate-500',
    iconTile: 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-500/30',
    accent: 'text-slate-700', accentHover: 'group-hover:text-slate-700',
  },
  {
    key: 'conduct', slug: 'conduct', Icon: FileText,
    card: 'bg-gradient-to-br from-blue-50 to-white border-blue-200 hover:border-blue-400',
    iconTile: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30',
    accent: 'text-blue-600', accentHover: 'group-hover:text-blue-600',
  },
  {
    key: 'scholarship', slug: 'scholarship', Icon: GraduationCap,
    card: 'bg-gradient-to-br from-violet-50 to-white border-violet-200 hover:border-violet-400',
    iconTile: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30',
    accent: 'text-violet-600', accentHover: 'group-hover:text-violet-600',
  },
  {
    key: 'hijra', slug: 'hijra', Icon: Home,
    card: 'bg-gradient-to-br from-amber-50 to-white border-amber-200 hover:border-amber-400',
    iconTile: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30',
    accent: 'text-amber-600', accentHover: 'group-hover:text-amber-600',
  },
  {
    key: 'tender', slug: 'tender', Icon: ClipboardList,
    card: 'bg-gradient-to-br from-cyan-50 to-white border-cyan-200 hover:border-cyan-400',
    iconTile: 'bg-gradient-to-br from-cyan-500 to-teal-600 shadow-cyan-500/30',
    accent: 'text-cyan-700', accentHover: 'group-hover:text-cyan-700',
  },
  {
    key: 'jobs', slug: 'jobs', Icon: Briefcase,
    card: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200 hover:border-emerald-400',
    iconTile: 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30',
    accent: 'text-emerald-600', accentHover: 'group-hover:text-emerald-600',
  },
] as const;

export default async function ServicesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Header */}
        <section className="relative text-white py-36 px-4 overflow-hidden min-h-[380px] flex items-center">
          <Image
            src="https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large"
            alt="RMC Services"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />
          <div className="relative max-w-4xl mx-auto text-center w-full">
            <div className="inline-flex items-center gap-2 bg-rmc-gold/20 border border-rmc-gold/30 text-rmc-gold px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold" />
              Our Services
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{t('services.title')}</h1>
            <p className="text-white/75 text-lg max-w-2xl mx-auto">{t('services.subtitle')}</p>
          </div>
        </section>

        {/* Services grid */}
        <section className="py-20 px-4 pattern-light">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(({ key, slug, Icon, card, iconTile, accent, accentHover }) => (
                <Link
                  key={key}
                  href={`/${locale}/services/${slug}`}
                  className={`group relative flex flex-col rounded-2xl border-2 ${card} p-8 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-200 overflow-hidden`}
                >
                  <div className="relative flex flex-col h-full">
                    {/* Elegant gradient icon tile */}
                    <div className={`w-14 h-14 rounded-2xl ${iconTile} flex items-center justify-center mb-5 shadow-md ring-1 ring-white/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200`}>
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.25} />
                    </div>
                    <h2 className={`text-xl font-bold text-gray-900 mb-2.5 ${accentHover} transition-colors`}>
                      {t(`services.${key}.title`)}
                    </h2>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {t(`services.${key}.desc`)}
                    </p>
                    <div className={`mt-6 flex items-center gap-1.5 ${accent} font-semibold text-sm`}>
                      {t('common.learnMore')}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-20 px-4 text-center overflow-hidden">
          <Image
            src="https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large"
            alt="Join RMC"
            fill
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rmc-green-deep/90 via-black/70 to-black/80" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to access our services?</h2>
            <p className="text-white/60 mb-10 text-base">Register as a member to apply for marriage certificates, scholarships, and more.</p>
            <a
              href={`/${locale}/register`}
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-rmc-gold text-white font-semibold rounded-full hover:bg-amber-500 transition-all duration-200 shadow-xl shadow-rmc-gold/25 hover:shadow-rmc-gold/40 hover:scale-105 active:scale-100"
            >
              Register Now <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
