'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Briefcase, MapPin, CalendarClock, CalendarDays, Users, Wallet,
  ArrowLeft, ArrowRight, Loader2, AlertTriangle, Clock, ClipboardList,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { jobPostingsApi, EMPLOYMENT_TYPE_LABELS, type JobPosting } from '@/lib/jobPostingsApi';
import { JobCard } from '@/components/services/jobs/JobCard';
import { formatDate, deadlineInfo, postedDate, canApplyTo } from '@/components/services/jobs/jobFormat';

export default function JobOpeningDetailPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const t = useTranslations('services.jobs.openings');

  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [related, setRelated] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    jobPostingsApi
      .get(id)
      .then((p) => { if (active) setPosting(p); })
      .catch(() => { if (active) setNotFound(true); })
      .finally(() => { if (active) setLoading(false); });
    // Fetch siblings for the "other open positions" block (best-effort).
    jobPostingsApi
      .listOpen()
      .then((all) => { if (active) setRelated(all.filter((p) => p.id !== id).slice(0, 3)); })
      .catch(() => { if (active) setRelated([]); });
    return () => { active = false; };
  }, [id]);

  const dl = deadlineInfo(posting?.applicationDeadline);
  const applyable = posting ? canApplyTo(posting) : false;
  const applyHref = `/${locale}/services/jobs/apply?job=${posting?.id}`;
  const backHref = `/${locale}/services/jobs`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative text-white overflow-hidden" style={{ minHeight: 'max(32vh, 260px)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-rmc-green-deep via-rmc-green-dark to-black" />
        <div className="absolute inset-0 pattern-islamic opacity-20" />
        <div className="relative px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="max-w-5xl mx-auto w-full">
            <Link href={backHref} className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t('back')}
            </Link>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-8 w-2/3 bg-white/15 rounded-lg" />
                <div className="h-4 w-1/2 bg-white/10 rounded" />
              </div>
            ) : posting ? (
              <>
                <div className="flex items-start gap-4">
                  <span className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 items-center justify-center shrink-0 backdrop-blur-sm">
                    <Briefcase className="w-7 h-7 text-white" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold drop-shadow leading-tight">{posting.title}</h1>
                    {posting.department && <p className="text-white/70 text-sm mt-1.5">{posting.department}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <HeroBadge icon={<Briefcase className="w-3.5 h-3.5" />}>{EMPLOYMENT_TYPE_LABELS[posting.employmentType]}</HeroBadge>
                  {posting.location && <HeroBadge icon={<MapPin className="w-3.5 h-3.5" />}>{posting.location}</HeroBadge>}
                  {posting.numberOfPositions > 1 && <HeroBadge icon={<Users className="w-3.5 h-3.5" />}>{posting.numberOfPositions} {t('positions')}</HeroBadge>}
                  {posting.applicationDeadline && (
                    <HeroBadge icon={<CalendarClock className="w-3.5 h-3.5" />} tone={dl.passed ? 'muted' : dl.soon ? 'warn' : 'default'}>
                      {t('deadline')} {formatDate(posting.applicationDeadline, locale)}
                    </HeroBadge>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-rmc-green animate-spin" />
          </div>
        ) : notFound || !posting ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-lg mx-auto">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">{t('notFound')}</p>
            <Link href={backHref} className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark transition-colors">
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('back')}
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-5">
              <Section title={t('about')} body={posting.description} />
              {posting.responsibilities && <Section title={t('responsibilities')} body={posting.responsibilities} />}
              {posting.requirements && <Section title={t('requirements')} body={posting.requirements} />}

              {/* Inline apply CTA (mobile-friendly, always visible in flow) */}
              {applyable && (
                <div className="rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between shadow-sm">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="w-6 h-6 text-white/90 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{t('applyNow')}</p>
                      {posting.applicationDeadline && (
                        <p className="text-white/75 text-sm mt-0.5">{t('deadline')} {formatDate(posting.applicationDeadline, locale)}</p>
                      )}
                    </div>
                  </div>
                  <Link href={applyHref} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-rmc-green-dark text-sm font-bold hover:bg-white/90 transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                    {t('applyNow')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </div>
              )}
            </div>

            {/* Sticky sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                  <h2 className="text-sm font-bold text-gray-900">{t('overview')}</h2>
                </div>
                <div className="p-5 space-y-3.5">
                  <Meta icon={<Briefcase className="w-4 h-4" />} label={t('typeLabel')} value={EMPLOYMENT_TYPE_LABELS[posting.employmentType]} />
                  {posting.location && <Meta icon={<MapPin className="w-4 h-4" />} label={t('locationLabel')} value={posting.location} />}
                  {posting.numberOfPositions > 1 && <Meta icon={<Users className="w-4 h-4" />} label={t('positionsLabel')} value={String(posting.numberOfPositions)} />}
                  {posting.salaryRange && <Meta icon={<Wallet className="w-4 h-4" />} label={t('salaryLabel')} value={posting.salaryRange} />}
                  {postedDate(posting) && (
                    <Meta icon={<CalendarDays className="w-4 h-4" />} label={t('posted')} value={formatDate(postedDate(posting), locale, { year: 'numeric', month: 'long', day: 'numeric' })} />
                  )}
                  {posting.applicationDeadline && (
                    <Meta
                      icon={<CalendarClock className="w-4 h-4" />}
                      label={t('deadlineLabel')}
                      value={formatDate(posting.applicationDeadline, locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                      badge={dl.soon && !dl.passed ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Clock className="w-2.5 h-2.5" /> {t('closingSoon')}</span> : undefined}
                    />
                  )}
                </div>
                <div className="px-5 pb-5">
                  {applyable ? (
                    <Link href={applyHref} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark shadow-sm hover:shadow-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/50 focus-visible:ring-offset-1">
                      {t('applyNow')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </Link>
                  ) : (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 text-center">
                      {dl.passed ? t('deadlineOver') : t('closed')}
                    </div>
                  )}
                </div>
              </div>

              <Link href={backHref} className="hidden lg:inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-rmc-green transition-colors px-1">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('back')}
              </Link>
            </aside>
          </div>
        )}

        {/* ── Related openings ── */}
        {!loading && posting && related.length > 0 && (
          <section className="mt-12 lg:mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">{t('relatedTitle')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {related.map((p) => <JobCard key={p.id} posting={p} />)}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function HeroBadge({
  icon, children, tone = 'default',
}: { icon: React.ReactNode; children: React.ReactNode; tone?: 'default' | 'warn' | 'muted' }) {
  const tones = {
    default: 'bg-white/10 text-white/90 ring-white/20',
    warn: 'bg-amber-400/20 text-amber-50 ring-amber-200/40',
    muted: 'bg-white/5 text-white/50 ring-white/10',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 backdrop-blur-sm ${tones[tone]}`}>
      {icon} {children}
    </span>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">
      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2.5">
        <span className="w-1 h-5 rounded-full bg-rmc-green" aria-hidden />
        {title}
      </h2>
      <div className="text-gray-600 text-[15px] leading-relaxed whitespace-pre-line ps-3.5">{body}</div>
    </div>
  );
}

function Meta({
  icon, label, value, badge,
}: { icon: React.ReactNode; label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-rmc-green shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 leading-none">{label}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm font-medium text-gray-900">{value}</p>
          {badge}
        </div>
      </div>
    </div>
  );
}
