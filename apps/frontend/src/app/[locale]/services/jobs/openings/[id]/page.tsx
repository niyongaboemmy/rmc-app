'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Briefcase, MapPin, CalendarClock, Users, Wallet, ArrowLeft, ArrowRight, Loader2, AlertTriangle,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { jobPostingsApi, EMPLOYMENT_TYPE_LABELS, type JobPosting } from '@/lib/jobPostingsApi';

export default function JobOpeningDetailPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const t = useTranslations('services.jobs.openings');
  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    jobPostingsApi
      .get(id)
      .then(setPosting)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const deadlinePassed =
    posting?.applicationDeadline && new Date(posting.applicationDeadline).getTime() < Date.now();
  const canApply = posting?.status === 'open' && !deadlinePassed;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <section className="relative text-white overflow-hidden flex flex-col" style={{ minHeight: 'max(30vh, 240px)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-900 to-black" />
        <div className="absolute inset-0 pattern-islamic opacity-20" />
        <div className="relative flex-1 flex items-center px-4 sm:px-6 lg:px-8 pt-24 pb-6">
          <div className="max-w-4xl mx-auto w-full">
            <Link href={`/${locale}/services/jobs`} className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> {t('back')}
            </Link>
            {posting && (
              <>
                <h1 className="text-2xl md:text-3xl font-bold drop-shadow">{posting.title}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-white/80 text-sm">
                  <span className="inline-flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {EMPLOYMENT_TYPE_LABELS[posting.employmentType]}</span>
                  {posting.department && <span>{posting.department}</span>}
                  {posting.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {posting.location}</span>}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
        ) : notFound || !posting ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">{t('notFound')}</p>
            <Link href={`/${locale}/services/jobs`} className="inline-block mt-4 text-emerald-600 hover:underline text-sm font-medium">{t('back')}</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Section title={t('about')} body={posting.description} />
              {posting.responsibilities && <Section title={t('responsibilities')} body={posting.responsibilities} />}
              {posting.requirements && <Section title={t('requirements')} body={posting.requirements} />}
            </div>

            <aside className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <Meta icon={<Briefcase className="w-4 h-4" />} label={t('typeLabel')} value={EMPLOYMENT_TYPE_LABELS[posting.employmentType]} />
                {posting.location && <Meta icon={<MapPin className="w-4 h-4" />} label={t('locationLabel')} value={posting.location} />}
                {posting.numberOfPositions > 1 && <Meta icon={<Users className="w-4 h-4" />} label={t('positionsLabel')} value={String(posting.numberOfPositions)} />}
                {posting.salaryRange && <Meta icon={<Wallet className="w-4 h-4" />} label={t('salaryLabel')} value={posting.salaryRange} />}
                {posting.applicationDeadline && (
                  <Meta icon={<CalendarClock className="w-4 h-4" />} label={t('deadlineLabel')}
                    value={new Date(posting.applicationDeadline).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })} />
                )}
              </div>

              {canApply ? (
                <Link href={`/${locale}/services/jobs/apply?job=${posting.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-sm font-semibold hover:shadow-lg hover:shadow-emerald-900/30 transition-all">
                  {t('applyNow')} <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 text-center">
                  {deadlinePassed ? t('deadlineOver') : t('closed')}
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-bold text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-emerald-500 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 leading-none">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}
