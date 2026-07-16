'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, MapPin, CalendarClock, ArrowRight, Loader2, Inbox } from 'lucide-react';
import { jobPostingsApi, EMPLOYMENT_TYPE_LABELS, type JobPosting } from '@/lib/jobPostingsApi';

export function OpenPositions() {
  const t = useTranslations('services.jobs.openings');
  const { locale } = useParams<{ locale: string }>();
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobPostingsApi
      .listOpen()
      .then(setPostings)
      .catch(() => setPostings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="openings" className="py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h2>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
          </div>
        ) : postings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">{t('none')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('noneSub')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {postings.map((p) => (
              <Link
                key={p.id}
                href={`/${locale}/services/jobs/openings/${p.id}`}
                className="group flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all p-5"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-emerald-700" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 leading-snug">{p.title}</p>
                    <p className="text-xs text-gray-400">{[p.department].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                    {EMPLOYMENT_TYPE_LABELS[p.employmentType]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 flex-1">{p.description}</p>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-gray-400">
                  {p.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {p.location}</span>}
                  {p.applicationDeadline && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" /> {t('deadline')}{' '}
                      {new Date(p.applicationDeadline).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {p.numberOfPositions > 1 && <span>{p.numberOfPositions} {t('positions')}</span>}
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 group-hover:gap-2.5 transition-all mt-4">
                  {t('viewApply')} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
