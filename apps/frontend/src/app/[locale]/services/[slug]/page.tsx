import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import {
  Moon,
  GraduationCap,
  FileText,
  Briefcase,
  Bell,
  Phone,
  Clock,
} from 'lucide-react';
import { BackToServices } from '@/components/services/BackToServices';

// ─── Per-service visual config ───────────────────────────────────────────────

type ServiceSlug = 'funeral' | 'scholarship' | 'tender' | 'jobs';

const SERVICE_META: Record<
  ServiceSlug,
  {
    Icon: React.ElementType;
    image: string;
    gradientFrom: string;
    gradientTo: string;
    overlay: string;
    eyebrowColor: string;
    iconBg: string;
    accentText: string;
    accentBorder: string;
    accentBg: string;
    eta: string;
  }
> = {
  funeral: {
    Icon: Moon,
    // Peaceful cemetery / nature — respectful, calm
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&q=80',
    gradientFrom: 'from-slate-600',
    gradientTo: 'to-slate-800',
    overlay: 'from-black/85 via-slate-950/65 to-black/45',
    eyebrowColor: 'text-slate-300',
    iconBg: 'from-slate-600 to-slate-800',
    accentText: 'text-slate-600',
    accentBorder: 'border-slate-200',
    accentBg: 'bg-slate-50',
    eta: 'Q3 2026',
  },
  scholarship: {
    Icon: GraduationCap,
    // Graduation caps thrown in the air
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-violet-900',
    overlay: 'from-black/85 via-violet-950/65 to-black/45',
    eyebrowColor: 'text-violet-300',
    iconBg: 'from-violet-600 to-violet-800',
    accentText: 'text-violet-600',
    accentBorder: 'border-violet-200',
    accentBg: 'bg-violet-50',
    eta: 'Q4 2026',
  },
  tender: {
    Icon: FileText,
    // Modern office building / construction site
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80',
    gradientFrom: 'from-teal-600',
    gradientTo: 'to-teal-900',
    overlay: 'from-black/85 via-teal-950/65 to-black/45',
    eyebrowColor: 'text-teal-300',
    iconBg: 'from-teal-600 to-teal-800',
    accentText: 'text-teal-600',
    accentBorder: 'border-teal-200',
    accentBg: 'bg-teal-50',
    eta: 'Q3 2026',
  },
  jobs: {
    Icon: Briefcase,
    // Professional team collaborating in office
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-emerald-900',
    overlay: 'from-black/85 via-emerald-950/65 to-black/45',
    eyebrowColor: 'text-emerald-300',
    iconBg: 'from-emerald-600 to-emerald-800',
    accentText: 'text-emerald-600',
    accentBorder: 'border-emerald-200',
    accentBg: 'bg-emerald-50',
    eta: 'Q3 2026',
  },
};

const VALID_SLUGS = Object.keys(SERVICE_META) as ServiceSlug[];

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ServiceComingSoonPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  // Good Conduct is now a live service — bounce old /services/conduct links
  // (bookmarks, external links) straight to the real route.
  if (slug === 'conduct') redirect(`/${locale}/services/good-conduct`);

  if (!VALID_SLUGS.includes(slug as ServiceSlug)) notFound();
  if (slug === 'tender') redirect(`/${locale}/tenders`);

  const meta = SERVICE_META[slug as ServiceSlug];
  const { Icon } = meta;
  const t = await getTranslations('services');
  const tc = await getTranslations('services.comingSoon');

  const title = t(`${slug}.title`);
  const desc = t(`${slug}.desc`);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="relative text-white overflow-hidden flex flex-col"
        style={{ minHeight: 'max(52vh, 420px)' }}
      >
        <Image src={meta.image} alt={title} fill className="object-cover object-center" priority />
        <div className={`absolute inset-0 bg-gradient-to-r ${meta.overlay}`} />
        <div className="absolute inset-0 pattern-islamic opacity-20" />

        {/* Centered hero content */}
        <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-4 pb-4">
          <div className="max-w-2xl mx-auto">
            {/* Icon */}
            <div className="flex justify-center mb-4 pt-24">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.iconBg} flex items-center justify-center shadow-xl shadow-black/30 ring-1 ring-white/20`}
              >
                <Icon className="w-7 h-7 text-white" strokeWidth={1.75} />
              </div>
            </div>

            {/* Coming Soon badge */}
            <div className="flex justify-center mb-3">
              <span
                className={`inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 ${meta.eyebrowColor} text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full`}
              >
                <Clock className="w-3 h-3" /> {tc('badge')}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg mb-3">{title}</h1>
            <p className="text-white/70 text-base max-w-xl mx-auto leading-relaxed">{desc}</p>
          </div>
        </div>

        {/* Back button — bottom of hero */}
        <BackToServices locale={locale} />
      </section>

      {/* ── Coming Soon Body ── */}
      <main className="flex-1 bg-gray-50 pattern-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {/* ETA card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className={`h-1 bg-gradient-to-r ${meta.gradientFrom} ${meta.gradientTo}`} />
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div
                className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${meta.iconBg} flex items-center justify-center shadow-md ring-1 ring-white/20`}
              >
                <Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  {tc('etaLabel')}
                </p>
                <p className={`text-2xl font-bold ${meta.accentText}`}>{meta.eta}</p>
                <p className="text-sm text-gray-500 mt-1">{tc('etaDesc')}</p>
              </div>
              <div
                className={`hidden sm:flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 ${meta.accentBorder} ${meta.accentBg} shrink-0`}
              >
                <Clock className={`w-6 h-6 ${meta.accentText} mb-1`} />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${meta.accentText}`}
                >
                  {tc('inProgress')}
                </span>
              </div>
            </div>
          </div>

          {/* What to expect */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-4">{tc('whatToExpect')}</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{tc('expectP1')}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{tc('expectP2')}</p>
          </div>

          {/* Contact CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/${locale}/contact`}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br ${meta.gradientFrom} ${meta.gradientTo} text-white text-sm font-semibold shadow-md hover:shadow-lg hover:opacity-90 transition-all`}
            >
              <Phone className="w-4 h-4" /> {tc('contactUs')}
            </Link>
            <Link
              href={`/${locale}/services`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <Bell className="w-4 h-4" /> {tc('viewOtherServices')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
