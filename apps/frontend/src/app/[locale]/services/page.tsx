import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';

// ── Stroke-only SVG icons — 24×24, respond to `currentColor` ─────────────────
// No fill backgrounds. Colour identity lives on the icon stroke + top accent bar.

function MarriageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      <circle cx="9" cy="12" r="4" />
      <circle cx="15" cy="12" r="4" />
    </svg>
  );
}

function FuneralIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      <circle cx="16.5" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="8" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="3.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ConductIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ScholarshipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      <line x1="22" y1="10" x2="22" y2="16" />
      <circle cx="22" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HajjIcon({ className }: { className?: string }) {
  // Kaaba: a cube with the kiswah band near the top.
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l8 4v11l-8 4-8-4v-11z" />
      <path d="M4 8.5l8 4 8-4" />
      <path d="M4 8.2h16" />
      <path d="M12 12.5V21" />
    </svg>
  );
}

function TenderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="12" y2="13" />
      <line x1="8" y1="17" x2="11" y2="17" />
      <circle cx="16" cy="17" r="3" />
      <path d="M14.8 17l.9.9 1.5-1.5" />
    </svg>
  );
}

function JobsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="17" rx="1" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="8" y1="10" x2="8" y2="21" />
      <line x1="16" y1="10" x2="16" y2="21" />
      <rect x="5" y="6" width="2" height="2" rx="0.3" />
      <rect x="11" y="6" width="2" height="2" rx="0.3" />
      <rect x="17" y="6" width="2" height="2" rx="0.3" />
    </svg>
  );
}

// ── Service definitions ────────────────────────────────────────────────────────
// All hover/accent Tailwind classes must be spelled out fully for JIT to detect them.
// `href` overrides the default `/services/{slug}` destination when provided.
const services = [
  {
    key: 'marriage', slug: 'marriage',
    Icon: MarriageIcon,
    bar: 'bg-rose-500',
    iconIdle: 'text-gray-300',
    iconHover: 'group-hover:text-rose-500',
    cta: 'text-rose-600',
    ctaHover: 'group-hover:text-rose-600',
    cardHover: 'hover:shadow-rose-100',
  },
  {
    key: 'funeral', slug: 'funeral',
    Icon: FuneralIcon,
    bar: 'bg-slate-500',
    iconIdle: 'text-gray-300',
    iconHover: 'group-hover:text-slate-500',
    cta: 'text-slate-600',
    ctaHover: 'group-hover:text-slate-600',
    cardHover: 'hover:shadow-slate-100',
  },
  {
    key: 'conduct', slug: 'conduct', href: '/services/good-conduct',
    Icon: ConductIcon,
    bar: 'bg-indigo-500',
    iconIdle: 'text-gray-300',
    iconHover: 'group-hover:text-indigo-500',
    cta: 'text-indigo-600',
    ctaHover: 'group-hover:text-indigo-600',
    cardHover: 'hover:shadow-indigo-100',
  },
  {
    key: 'scholarship', slug: 'scholarship',
    Icon: ScholarshipIcon,
    bar: 'bg-violet-500',
    iconIdle: 'text-gray-300',
    iconHover: 'group-hover:text-violet-500',
    cta: 'text-violet-600',
    ctaHover: 'group-hover:text-violet-600',
    cardHover: 'hover:shadow-violet-100',
  },
  {
    key: 'hajj', slug: 'hajj',
    Icon: HajjIcon,
    bar: 'bg-amber-500',
    iconIdle: 'text-gray-300',
    iconHover: 'group-hover:text-amber-500',
    cta: 'text-amber-600',
    ctaHover: 'group-hover:text-amber-600',
    cardHover: 'hover:shadow-amber-100',
  },
  {
    key: 'tender', slug: 'tender', href: '/tenders',
    Icon: TenderIcon,
    bar: 'bg-teal-500',
    iconIdle: 'text-gray-300',
    iconHover: 'group-hover:text-teal-500',
    cta: 'text-teal-600',
    ctaHover: 'group-hover:text-teal-600',
    cardHover: 'hover:shadow-teal-100',
  },
  {
    key: 'jobs', slug: 'jobs',
    Icon: JobsIcon,
    bar: 'bg-emerald-500',
    iconIdle: 'text-gray-300',
    iconHover: 'group-hover:text-emerald-500',
    cta: 'text-emerald-600',
    ctaHover: 'group-hover:text-emerald-600',
    cardHover: 'hover:shadow-emerald-100',
  },
] as const;

export default async function ServicesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <PageHero
          eyebrow={t('services.eyebrow')}
          title={t('services.title')}
          subtitle={t('services.subtitle')}
          ornament
        />

        <section className="py-20 px-4 sm:px-6 lg:px-8 pattern-light">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map(({ key, slug, Icon, bar, iconIdle, iconHover, cta, ctaHover, cardHover, ...rest }, idx) => (
                <Link
                  key={key}
                  href={'href' in rest ? `/${locale}${rest.href}` : `/${locale}/services/${slug}`}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100/80 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${cardHover}`}
                >
                  {/* Sliding top-accent bar — reveals left-to-right on hover */}
                  <span
                    className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 rounded-t-2xl transition-transform duration-500 ease-out group-hover:scale-x-100 ${bar}`}
                  />

                  {/* Icon row */}
                  <div className="mb-6 flex items-start justify-between">
                    <div className={`transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 ${iconIdle} ${iconHover}`}>
                      <Icon className="w-10 h-10" />
                    </div>
                    <span className="font-mono text-[11px] tracking-widest text-gray-200 transition-colors duration-300 group-hover:text-gray-300">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Content */}
                  <h2 className="mb-2 text-[1.05rem] font-bold leading-snug text-gray-900">
                    {t(`services.${key}.title`)}
                  </h2>
                  <p className="flex-1 text-sm leading-relaxed text-gray-400">
                    {t(`services.${key}.desc`)}
                  </p>

                  {/* CTA */}
                  <div className={`mt-7 flex items-center gap-1.5 text-sm font-semibold text-gray-300 transition-colors duration-300 ${ctaHover}`}>
                    {t('common.learnMore')}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
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
