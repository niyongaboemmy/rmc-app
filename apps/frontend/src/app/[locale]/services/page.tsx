import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Heart, FileText, ClipboardList, GraduationCap, Home, Briefcase, ArrowRight, ScrollText } from 'lucide-react';

/**
 * Per-service theme. Cards share a clean white base so the grid reads as a
 * cohesive set; each service keeps its identity through a gradient icon tile,
 * an accent colour, and a subtle border/shadow tint on hover.
 * Class strings are fully spelled out so Tailwind's JIT can detect them.
 */
const services = [
  {
    key: 'marriage', slug: 'marriage', Icon: Heart,
    iconTile: 'bg-gradient-to-br from-rose-500 to-rose-700',
    hover: 'hover:border-rose-200 hover:shadow-rose-500/10',
    accent: 'text-rose-600', accentHover: 'group-hover:text-rose-700',
  },
  {
    key: 'funeral', slug: 'funeral', Icon: ScrollText,
    iconTile: 'bg-gradient-to-br from-slate-500 to-slate-700',
    hover: 'hover:border-slate-200 hover:shadow-slate-500/10',
    accent: 'text-slate-600', accentHover: 'group-hover:text-slate-700',
  },
  {
    key: 'conduct', slug: 'conduct', Icon: FileText,
    iconTile: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    hover: 'hover:border-blue-200 hover:shadow-blue-500/10',
    accent: 'text-blue-600', accentHover: 'group-hover:text-blue-600',
  },
  {
    key: 'scholarship', slug: 'scholarship', Icon: GraduationCap,
    iconTile: 'bg-gradient-to-br from-violet-500 to-purple-600',
    hover: 'hover:border-violet-200 hover:shadow-violet-500/10',
    accent: 'text-violet-600', accentHover: 'group-hover:text-violet-600',
  },
  {
    key: 'hijra', slug: 'hijra', Icon: Home,
    iconTile: 'bg-gradient-to-br from-amber-500 to-orange-600',
    hover: 'hover:border-amber-200 hover:shadow-amber-500/10',
    accent: 'text-amber-600', accentHover: 'group-hover:text-amber-600',
  },
  {
    key: 'tender', slug: 'tender', Icon: ClipboardList,
    iconTile: 'bg-gradient-to-br from-cyan-500 to-teal-600',
    hover: 'hover:border-cyan-200 hover:shadow-cyan-500/10',
    accent: 'text-cyan-700', accentHover: 'group-hover:text-cyan-700',
  },
  {
    key: 'jobs', slug: 'jobs', Icon: Briefcase,
    iconTile: 'bg-gradient-to-br from-emerald-500 to-green-600',
    hover: 'hover:border-emerald-200 hover:shadow-emerald-500/10',
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
        <PageHero
          eyebrow="Our Services"
          title={t('services.title')}
          subtitle={t('services.subtitle')}
          ornament
        />

        {/* Services grid */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 pattern-light">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(({ key, slug, Icon, iconTile, hover, accent, accentHover }) => (
                <Link
                  key={key}
                  href={`/${locale}/services/${slug}`}
                  className={`group flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${hover}`}
                >
                  {/* Gradient icon tile carries each service's colour identity */}
                  <div className={`w-12 h-12 rounded-xl ${iconTile} flex items-center justify-center mb-5 shadow-sm ring-1 ring-white/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.25} />
                  </div>
                  <h2 className={`text-lg font-bold text-gray-900 mb-2 ${accentHover} transition-colors`}>
                    {t(`services.${key}.title`)}
                  </h2>
                  <p className="text-gray-500 leading-relaxed text-sm">
                    {t(`services.${key}.desc`)}
                  </p>
                  <div className={`mt-auto pt-5 flex items-center gap-1.5 ${accent} font-semibold text-sm`}>
                    {t('common.learnMore')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
