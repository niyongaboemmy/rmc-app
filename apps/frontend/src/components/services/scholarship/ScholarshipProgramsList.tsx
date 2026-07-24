'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GraduationCap, Clock, ArrowRight, AlertCircle, Coins } from 'lucide-react';
import { scholarshipPublicApi, type ScholarshipProgram } from '@/lib/scholarshipApi';

function getDiffDays(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

function isClosingSoon(deadline: string | null): boolean {
  const diff = getDiffDays(deadline);
  return diff !== null && diff >= 0 && diff <= 7;
}

export function ScholarshipProgramsList() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.scholarship');
  const tLevels = useTranslations('services.scholarship.levels');
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    scholarshipPublicApi
      .listPrograms()
      .then(setPrograms)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-52 rounded-2xl bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-5">
          <AlertCircle className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm text-gray-400">{t('landing.programsLoadError')}</p>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 mb-5">
          <GraduationCap className="w-7 h-7 text-emerald-300" />
        </div>
        <p className="text-base font-semibold text-gray-400">{t('landing.programsEmptyTitle')}</p>
        <p className="text-sm text-gray-300 mt-1">{t('landing.programsEmptyText')}</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {programs.map((program, i) => {
        const closing = isClosingSoon(program.deadline);
        return (
          <Link
            key={program.id}
            href={`/${locale}/services/scholarship/apply?program=${program.id}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/60"
          >
            <span
              className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 rounded-t-2xl transition-transform duration-500 ease-out group-hover:scale-x-100 ${
                closing ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />

            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
              </div>
              <span className="font-mono text-[11px] tracking-widest text-gray-200 group-hover:text-gray-300 transition-colors">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>

            <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors duration-300">
              {program.title}
            </h3>

            <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 flex-1 mb-4">
              {program.description}
            </p>

            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {program.level && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    {tLevels(program.level)}
                  </span>
                )}
                {program.amount != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                    <Coins className="w-3 h-3" /> {program.amount.toLocaleString()} RWF
                  </span>
                )}
              </div>
              {program.deadline && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold shrink-0 ${
                    closing ? 'text-amber-600' : 'text-gray-400'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {new Date(program.deadline).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            <span className="mt-3 inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-300 group-hover:text-emerald-600 transition-colors self-start">
              {t('landing.viewAndApply')} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
