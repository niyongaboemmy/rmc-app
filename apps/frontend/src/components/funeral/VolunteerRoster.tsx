'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Users } from 'lucide-react';
import { funeralApi } from '@/lib/funeralApi';
import { pickStep } from './stepLabels';
import type { Volunteer, VolunteerTask, FuneralSkillConfig } from './types';
import { PublicVolunteerCard } from './PublicVolunteerCard';
import { EmptyState } from './EmptyState';

type Filter = 'all' | 'available' | 'busy';

/**
 * Public, read-only volunteer roster for the funeral website: browse attendants
 * by name and availability. Purely informative — assignment and roster
 * management live in the admin dashboard (VolunteerManagement).
 */
export function VolunteerRoster() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.funeral.volunteers');

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [skills, setSkills] = useState<FuneralSkillConfig[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mosqueFilter, setMosqueFilter] = useState('');

  const skillByKey = new Map(skills.map((s) => [s.key, s]));
  const taskLabel = (task: VolunteerTask) => { const s = skillByKey.get(task); return s ? pickStep(s.label, locale) : task; };

  useEffect(() => {
    let active = true;
    funeralApi.listVolunteers()
      .then((res) => { if (active) setVolunteers(res); })
      .catch(() => { if (active) setVolunteers([]); });
    funeralApi.listSkills()
      .then((res) => { if (active) setSkills(res); })
      .catch(() => { if (active) setSkills([]); });
    return () => { active = false; };
  }, []);

  const mosqueOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of volunteers) if (v.mosqueId) map.set(v.mosqueId, v.mosqueName ?? '');
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [volunteers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return volunteers.filter((v) => {
      if (q && !v.name.toLowerCase().includes(q)) return false;
      if (filter === 'available' && v.assignedTask) return false;
      if (filter === 'busy' && !v.assignedTask) return false;
      if (mosqueFilter && v.mosqueId !== mosqueFilter) return false;
      return true;
    });
  }, [volunteers, query, filter, mosqueFilter]);

  const cardLabels = {
    skills: t('skills'),
    available: t('available'),
    busy: t('busy'),
    taskLabel,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'available', label: t('filterAvailable') },
    { key: 'busy', label: t('filterBusy') },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 rtl:pl-3 rtl:pr-9"
          />
        </div>
        <div className="inline-flex self-start rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label={t('filterAll')}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                filter === f.key ? 'bg-rmc-green text-white shadow-sm' : 'text-gray-500 hover:text-rmc-green'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={mosqueFilter}
          onChange={(e) => setMosqueFilter(e.target.value)}
          aria-label={t('allMosques')}
          className="self-start rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
        >
          <option value="">{t('allMosques')}</option>
          {mosqueOptions.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={t('emptyTitle')} message={t('emptyText')} />
      ) : (
        <>
          <p className="text-[13px] text-gray-400">{t('resultsCount', { count: filtered.length })}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <PublicVolunteerCard key={v.id} volunteer={v} labels={cardLabels} mosqueName={v.mosqueName} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
