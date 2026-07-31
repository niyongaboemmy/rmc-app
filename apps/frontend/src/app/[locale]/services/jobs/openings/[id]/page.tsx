'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Briefcase, MapPin, Clock, Calendar, Users, Wallet, ArrowLeft, ArrowRight,
  AlertCircle, FileText, ListChecks, CheckCircle2,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { jobPostingsApi, EMPLOYMENT_TYPE_LABELS, type JobPosting } from '@/lib/jobPostingsApi';
import { formatDate, deadlineInfo, postedDate, canApplyTo, statusOf, type JobStatus } from '@/components/services/jobs/jobFormat';

// Status-driven accents, spelled out for the JIT — mirrors the Tenders detail.
const STATUS_STYLES: Record<JobStatus, { dot: string; chip: string }> = {
  open: { dot: 'bg-rmc-green', chip: 'bg-rmc-green/10 text-rmc-green' },
  closing: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600' },
  closed: { dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-500' },
};

export default function JobOpeningDetailPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const t = useTranslations('services.jobs.openings');

  const [posting, setPosting] = useState<JobPosting | null>(null);
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
    return () => { active = false; };
  }, [id]);

  const dl = deadlineInfo(posting?.applicationDeadline);
  const status: JobStatus = posting ? statusOf(posting) : 'open';
  const styles = STATUS_STYLES[status];
  const applyable = posting ? canApplyTo(posting) : false;
  const applyHref = `/${locale}/services/jobs/apply?job=${posting?.id}`;
  const backHref = `/${locale}/services/jobs`;

  const deadlineTone =
    dl.daysLeft === null
      ? 'text-gray-500'
      : dl.passed
      ? 'text-gray-400'
      : dl.daysLeft <= 3
      ? 'text-red-600'
      : dl.daysLeft <= 7
      ? 'text-amber-600'
      : 'text-rmc-green';

  function deadlineRelative(): string {
    if (dl.daysLeft === null) return t('noDeadline');
    if (dl.passed) return t('applicationsClosed');
    if (dl.daysLeft === 0) return t('closesToday');
    if (dl.daysLeft === 1) return t('closesTomorrow');
    return t('closesInDays', { days: dl.daysLeft });
  }

  const dateOpts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };

  return (
    <div className="min-h-screen">
      <Navbar solid />
      <main>
        <section className="pt-24 md:pt-28 pb-12 sm:pb-14 bg-gray-50 pattern-light">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header card — back link, eyebrow, title and status/type chips. */}
            {!notFound && (
              <div className="mb-6 rounded-lg border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-rmc-green"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t('back')}
                </Link>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-rmc-green">
                  {t('eyebrow')}
                </p>
                <h1 className="mt-1 text-2xl md:text-3xl font-bold text-gray-900">
                  {loading ? t('title') : posting ? posting.title : t('notFound')}
                </h1>
                {posting && (
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${styles.chip}`}>
                      <Clock className="h-3 w-3" />
                      {deadlineRelative()}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                      <Briefcase className="h-3 w-3" />
                      {EMPLOYMENT_TYPE_LABELS[posting.employmentType]}
                    </span>
                    {posting.department && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                        {posting.department}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Loading skeletons */}
            {loading && (
              <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 animate-pulse">
                <div className="h-72 rounded-lg bg-white border border-gray-100 lg:col-span-1" />
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-64 rounded-lg bg-white border border-gray-100" />
                  <div className="h-40 rounded-lg bg-white border border-gray-100" />
                </div>
              </div>
            )}

            {/* Not found */}
            {!loading && (notFound || !posting) && (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-5">
                  <AlertCircle className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-lg font-semibold text-gray-400">{t('notFound')}</p>
                <Link
                  href={backHref}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:underline"
                >
                  ← {t('back')}
                </Link>
              </div>
            )}

            {/* Content */}
            {!loading && posting && (
              <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Main column — description + responsibilities + requirements (right on desktop) */}
                <div className="order-2 lg:order-2 lg:col-span-2 space-y-6">
                  <Section icon={<FileText className="w-4 h-4 text-rmc-green" />} title={t('about')} body={posting.description} />
                  {posting.responsibilities && (
                    <Section icon={<ListChecks className="w-4 h-4 text-rmc-green" />} title={t('responsibilities')} body={posting.responsibilities} />
                  )}
                  {posting.requirements && (
                    <Section icon={<CheckCircle2 className="w-4 h-4 text-rmc-green" />} title={t('requirements')} body={posting.requirements} />
                  )}
                </div>

                {/* Sidebar — key facts + apply CTA; left on desktop, first on mobile */}
                <aside className="order-1 lg:order-1 lg:col-span-1">
                  <div className="lg:sticky lg:top-24 space-y-5">
                    {/* Overview card */}
                    <div className="rounded-lg bg-white border border-gray-100 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-gray-50">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900">
                          <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                          {t(`filters.${status}`)}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{t('overview')}</span>
                      </div>

                      <dl className="p-5 space-y-4 text-sm">
                        <Fact icon={<Briefcase className="w-4 h-4 text-gray-400" />} label={t('typeLabel')} value={EMPLOYMENT_TYPE_LABELS[posting.employmentType]} />
                        {posting.location && <Fact icon={<MapPin className="w-4 h-4 text-gray-400" />} label={t('locationLabel')} value={posting.location} />}
                        {posting.numberOfPositions > 1 && <Fact icon={<Users className="w-4 h-4 text-gray-400" />} label={t('positionsLabel')} value={String(posting.numberOfPositions)} />}
                        {posting.salaryRange && <Fact icon={<Wallet className="w-4 h-4 text-gray-400" />} label={t('salaryLabel')} value={posting.salaryRange} />}

                        {/* Deadline with relative countdown */}
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
                            <Clock className="w-4 h-4 text-gray-400" />
                          </span>
                          <div className="min-w-0">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t('deadlineLabel')}</dt>
                            <dd className="font-semibold text-gray-900">
                              {posting.applicationDeadline ? formatDate(posting.applicationDeadline, locale, dateOpts) : t('noDeadline')}
                            </dd>
                            {posting.applicationDeadline && (
                              <dd className={`text-xs font-medium mt-0.5 ${deadlineTone}`}>{deadlineRelative()}</dd>
                            )}
                          </div>
                        </div>

                        {/* Posted */}
                        {postedDate(posting) && (
                          <Fact icon={<Calendar className="w-4 h-4 text-gray-400" />} label={t('posted')} value={formatDate(postedDate(posting), locale, dateOpts)} />
                        )}
                      </dl>

                      {/* Days remaining — a highlighted count, colour-coded by urgency */}
                      {dl.daysLeft !== null && dl.daysLeft >= 0 && (
                        <div className="px-5 pb-5 -mt-1">
                          {dl.daysLeft === 0 ? (
                            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm font-bold">{t('closesToday')}</span>
                            </div>
                          ) : (
                            <div
                              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                                dl.daysLeft <= 3 ? 'bg-red-50' : dl.daysLeft <= 7 ? 'bg-amber-50' : 'bg-rmc-green-light/50'
                              }`}
                            >
                              <span
                                className={`text-3xl font-extrabold leading-none tabular-nums ${
                                  dl.daysLeft <= 3 ? 'text-red-600' : dl.daysLeft <= 7 ? 'text-amber-600' : 'text-rmc-green'
                                }`}
                              >
                                {dl.daysLeft}
                              </span>
                              <span className="text-xs font-semibold text-gray-600">
                                {dl.daysLeft === 1 ? t('dayRemaining') : t('daysRemaining')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Apply CTA */}
                    <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm text-center">
                      <p className="text-sm font-bold text-gray-900">{t('ctaTitle')}</p>
                      <p className="mt-1 mb-4 text-xs leading-relaxed text-gray-500">{t('ctaSubtitle')}</p>
                      {applyable ? (
                        <Link
                          href={applyHref}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rmc-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark outline-none focus-visible:ring-2 focus-visible:ring-rmc-green/50 focus-visible:ring-offset-1"
                        >
                          {t('applyNow')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                      ) : (
                        <p className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-400">
                          {dl.passed ? t('deadlineOver') : t('closed')}
                        </p>
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function Section({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
        {icon}
        {title}
      </h2>
      <div className="prose prose-sm prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
        {body}
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
        <dd className="font-semibold text-gray-900">{value}</dd>
      </div>
    </div>
  );
}
