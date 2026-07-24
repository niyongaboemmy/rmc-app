import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Briefcase, ArrowLeft, ArrowRight, FileText, Search,
  Users, GraduationCap, UserCheck, CheckCircle2, Phone,
} from 'lucide-react';
import { OpenPositions } from '@/components/services/jobs/OpenPositions';

// Copy for every card/step/faq lives in translations — these just drive the loops.
const whoIcons = { seekers: Briefcase, graduates: GraduationCap, professionals: UserCheck, community: Users } as const;
const whoKeys = ['seekers', 'graduates', 'professionals', 'community'] as const;
const stepKeys = ['s1', 's2', 's3', 's4', 's5'] as const;
const needKeys = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'] as const;
const faqKeys = ['f1', 'f2', 'f3', 'f4'] as const;

export default async function JobsServicePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('services.jobs');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* ── Hero ── */}
        <section
          className="relative text-white overflow-hidden flex flex-col"
          style={{ minHeight: 'max(46vh, 360px)' }}
        >
          <Image
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&q=80"
            alt="Job opportunities"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rmc-green-deep/95 via-rmc-green-dark/80 to-black/70" />
          <div className="absolute inset-0 pattern-islamic opacity-25" />

          {/* Top: back link */}
          <div className="relative px-4 sm:px-6 lg:px-8 pt-24">
            <div className="max-w-5xl mx-auto">
              <Link
                href={`/${locale}/services`}
                className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/20 hover:border-white/40"
              >
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t('landing.backToServices')}
              </Link>
            </div>
          </div>

          {/* Center */}
          <div className="relative flex-1 flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-10">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-black/20">
                  <Briefcase className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-lg leading-tight">{t('landing.heroTitle')}</h1>
              <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">{t('landing.heroSubtitle')}</p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="#openings"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-rmc-green-dark text-sm font-bold hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-100 shadow-lg shadow-black/10 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Search className="w-4 h-4" /> {t('openings.title')}
                </a>
                <Link
                  href={`/${locale}/services/jobs/apply`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/25 text-white text-sm font-semibold hover:bg-white/20 hover:border-white/50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {t('landing.applyCta')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA cards (apply / check status) ── */}
        <section className="bg-gray-50/70 pattern-light py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-100">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-5">
            <ActionCard
              href={`/${locale}/services/jobs/apply`}
              icon={<FileText className="w-5 h-5" />}
              title={t('landing.applyTitle')}
              text={t('landing.applyText')}
              cta={t('landing.applyCta')}
            />
            <ActionCard
              href={`/${locale}/services/jobs/status`}
              icon={<Search className="w-5 h-5" />}
              title={t('landing.statusTitle')}
              text={t('landing.statusText')}
              cta={t('landing.statusCta')}
            />
          </div>
        </section>

        {/* ── Current openings (admin-posted vacancies) ── */}
        <OpenPositions />

        {/* ── Who it's for ── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
          <div className="max-w-6xl mx-auto">
            <SectionHeading title={t('landing.whoTitle')} subtitle={t('landing.whoSubtitle')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {whoKeys.map((key) => {
                const Icon = whoIcons[key];
                return (
                  <div
                    key={key}
                    className="group bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:shadow-rmc-green/10 hover:border-rmc-green/40 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-11 h-11 rounded-xl bg-rmc-green-light ring-1 ring-rmc-green/10 flex items-center justify-center mb-4 group-hover:bg-rmc-green group-hover:ring-rmc-green transition-colors duration-300">
                      <Icon className="w-5 h-5 text-rmc-green-dark group-hover:text-white transition-colors duration-300" strokeWidth={2} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{t(`landing.who.${key}.title`)}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{t(`landing.who.${key}.text`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How to apply (steps) ── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-rmc-green-light/40 pattern-light border-y border-rmc-green/10">
          <div className="max-w-3xl mx-auto">
            <SectionHeading title={t('landing.stepsTitle')} subtitle={t('landing.stepsSubtitle')} />
            <div className="relative">
              <div className="absolute start-4 top-3 bottom-3 w-px bg-gradient-to-b from-rmc-green via-rmc-green/60 to-transparent" aria-hidden />
              <ol className="space-y-4">
                {stepKeys.map((key, i) => (
                  <li key={key} className="relative flex gap-5 items-start">
                    <div className="relative z-10 w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white text-sm font-bold flex items-center justify-center shadow-md shadow-rmc-green-dark/25 ring-4 ring-rmc-green-light/60">
                      {i + 1}
                    </div>
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-rmc-green/40 transition-all duration-200 flex-1">
                      <h3 className="font-bold text-gray-900 text-sm mb-1">{t(`landing.steps.${key}.title`)}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{t(`landing.steps.${key}.text`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── What you'll need (documents) ── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden grid md:grid-cols-5">
              <div className="md:col-span-2 relative bg-gradient-to-br from-rmc-green to-rmc-green-deep p-7 lg:p-8 text-white flex flex-col justify-center overflow-hidden">
                <div className="absolute inset-0 pattern-islamic opacity-15" aria-hidden />
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">{t('landing.needTitle')}</h2>
                  <p className="text-white/80 text-sm leading-relaxed">{t('landing.needSubtitle')}</p>
                </div>
              </div>
              <div className="md:col-span-3 p-7 lg:p-8">
                <ul className="space-y-3.5">
                  {needKeys.map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-rmc-green-light flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rmc-green" />
                      </span>
                      <span className="text-gray-700 text-sm leading-relaxed">{t(`landing.need.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50/70 pattern-light border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <SectionHeading title={t('landing.faqTitle')} />
            <div className="space-y-3">
              {faqKeys.map((key) => (
                <details
                  key={key}
                  className="group bg-white border border-gray-200/80 rounded-2xl px-5 py-4 shadow-sm hover:border-rmc-green/40 transition-colors duration-200 [&_summary]:list-none open:shadow-md"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer font-bold text-gray-900 text-sm outline-none focus-visible:text-rmc-green">
                    {t(`landing.faqs.${key}.q`)}
                    <span className="w-6 h-6 shrink-0 rounded-full bg-rmc-green-light text-rmc-green-dark flex items-center justify-center text-base leading-none group-open:rotate-45 group-open:bg-rmc-green group-open:text-white transition-all duration-200">
                      +
                    </span>
                  </summary>
                  <p className="text-gray-500 text-sm leading-relaxed mt-3">{t(`landing.faqs.${key}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="relative py-16 lg:py-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&q=80"
            alt="Start your job application"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rmc-green-deep/92 via-black/80 to-black/85" />
          <div className="absolute inset-0 pattern-islamic opacity-20" />
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{t('landing.ctaTitle')}</h2>
            <p className="text-white/70 mb-8 text-sm md:text-base leading-relaxed">{t('landing.ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${locale}/services/jobs/apply`}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-rmc-green-dark text-sm font-bold rounded-xl hover:bg-white/90 transition-all duration-200 hover:scale-[1.02] active:scale-100 shadow-lg shadow-black/10 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t('landing.ctaStart')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 border border-white/25 text-white text-sm font-semibold rounded-xl hover:bg-white/20 hover:border-white/50 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <Phone className="w-4 h-4" /> {t('landing.ctaContact')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-8 max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm md:text-base mt-2 leading-relaxed">{subtitle}</p>}
      <div className="w-12 h-1 rounded-full bg-rmc-green/70 mx-auto mt-4" aria-hidden />
    </div>
  );
}

function ActionCard({
  href, icon, title, text, cta,
}: { href: string; icon: React.ReactNode; title: string; text: string; cta: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:shadow-lg hover:shadow-rmc-green/10 hover:border-rmc-green/40 hover:-translate-y-0.5 transition-all duration-300 p-6 outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/40"
    >
      <div className="w-12 h-12 rounded-xl bg-rmc-green-light ring-1 ring-rmc-green/10 flex items-center justify-center text-rmc-green-dark group-hover:bg-rmc-green group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <p className="font-bold text-gray-900 text-base">{title}</p>
      <p className="text-sm text-gray-500 flex-1 leading-relaxed">{text}</p>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green group-hover:gap-2.5 transition-all">
        {cta} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
      </span>
    </Link>
  );
}
