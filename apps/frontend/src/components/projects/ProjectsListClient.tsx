'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Building2, Target, TrendingUp, Layers } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ProjectCard } from '@/components/projects/ProjectCard';
import {
  ContentKeys,
  PROJECTS_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  isRtl,
  projectMoneyShort,
  type ProjectsContent,
} from '@/lib/content-api';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80';

function StatPill({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-4 w-4 text-rmc-gold-light" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-none text-white tabular-nums">{value}</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">{label}</p>
      </div>
    </div>
  );
}

export function ProjectsListClient() {
  const { locale } = useParams<{ locale: string }>();
  const rtl = isRtl(locale);
  const arFont = rtl ? 'font-arabic' : '';

  const [content, setContent] = useState<ProjectsContent>(PROJECTS_DEFAULT);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    getSiteContent<ProjectsContent>(ContentKeys.projects)
      .then((data) => {
        if (active && data) setContent(mergeContent(PROJECTS_DEFAULT, data));
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  // Ongoing first, completed last; otherwise the admin's order.
  const items = useMemo(
    () => [...content.items].sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0)),
    [content.items],
  );

  const stats = useMemo(() => {
    const currency = items[0]?.currency || 'RWF';
    const raised = items.reduce((s, p) => s + (Number(p.fundCollected) || 0), 0);
    const goal = items.reduce((s, p) => s + (Number(p.fundNeeded) || 0), 0);
    return { count: items.length, raised, goal, currency };
  }, [items]);

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfcfb]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative flex min-h-[46vh] items-center overflow-hidden bg-rmc-green-deep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-rmc-green-deep/95 via-rmc-green-deep/80 to-black/50" />
        <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-20" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/50 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-36 pb-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl animate-fade-up">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold" />
              {pick(content.eyebrow, locale)}
            </span>
            <h1 className={`text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
              {pick(content.title, locale)}
            </h1>
            <p className={`mt-4 max-w-xl text-sm leading-relaxed text-white/75 md:text-base ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
              {pick(content.lede, locale)}
            </p>

            {/* Stats — only once we have projects */}
            {loaded && items.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-3">
                <StatPill icon={Layers} label={pick({ en: 'Projects', rw: 'Imishinga', ar: 'مشاريع' }, locale)} value={String(stats.count)} />
                <StatPill icon={TrendingUp} label={pick({ en: 'Raised', rw: 'Byakusanyijwe', ar: 'تم جمعه' }, locale)} value={projectMoneyShort(stats.currency, stats.raised)} />
                <StatPill icon={Target} label={pick({ en: 'Goal', rw: 'Intego', ar: 'الهدف' }, locale)} value={projectMoneyShort(stats.currency, stats.goal)} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
          {!loaded ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
                  <div className="h-52 w-full animate-pulse bg-gray-100" />
                  <div className="space-y-3 p-5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                    <div className="h-2 w-full animate-pulse rounded bg-gray-100" />
                    <div className="h-2 w-1/2 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mx-auto max-w-md rounded-3xl border border-dashed border-gray-200 bg-white/70 p-12 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rmc-green-light">
                <Building2 className="h-7 w-7 text-rmc-green" aria-hidden="true" />
              </span>
              <p className={`text-base font-bold text-gray-800 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                {pick({ en: 'No projects yet', rw: 'Nta mishinga irahari', ar: 'لا توجد مشاريع بعد' }, locale)}
              </p>
              <p className={`mt-1.5 text-sm leading-relaxed text-gray-500 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                {pick({ en: 'Our ongoing construction and community projects will appear here soon, insha’Allah.', rw: 'Imishinga yacu yo kubaka n’iy’umuryango izagaragara hano vuba, insha’Allah.', ar: 'ستظهر مشاريعنا الإنشائية والمجتمعية الجارية هنا قريبًا إن شاء الله.' }, locale)}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((project) => (
                <ProjectCard key={project.slug} project={project} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
