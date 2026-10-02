'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Heart,
  ShieldCheck,
  Briefcase,
  Wallet,
  BarChart2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { marriageApi } from '@/lib/marriageApi';
import { donationsApi } from '@/lib/donationsApi';
import { goodConductAdminApi } from '@/lib/goodConductAdminApi';
import { tenderApplicationAdminApi } from '@/lib/tenderApplicationAdminApi';

// Admin UI is English-only (matches the other admin pages).

export default function AdminReportsPage() {
  return (
    <ProtectedRoute permissions={[Permission.REPORTS_VIEW]}>
      <AdminReportsContent />
    </ProtectedRoute>
  );
}

interface Metric {
  label: string;
  value: string;
}

interface DomainConfig {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string; // tailwind text color for the icon
  bg: string; // tailwind bg for the icon tile
  permission: Permission;
  load: () => Promise<Metric[]>;
}

const rwf = (n: number) => `${Number(n || 0).toLocaleString()} RWF`;
const num = (n: number) => Number(n || 0).toLocaleString();

const DOMAINS: DomainConfig[] = [
  {
    key: 'marriage',
    title: 'Marriage',
    description: 'Applications and fees collected.',
    href: '/admin/marriage',
    icon: Heart,
    accent: 'text-rose-600',
    bg: 'bg-rose-50',
    permission: Permission.MARRIAGE_VIEW,
    load: async () => {
      const s = await marriageApi.admin.getStats();
      return [
        { label: 'Total applications', value: num(s.total) },
        { label: 'Revenue', value: rwf(s.revenue) },
      ];
    },
  },
  {
    key: 'goodConduct',
    title: 'Good Conduct',
    description: 'Certificate requests and fees collected.',
    href: '/admin/good-conduct',
    icon: ShieldCheck,
    accent: 'text-indigo-600',
    bg: 'bg-indigo-50',
    permission: Permission.GOOD_CONDUCT_VIEW,
    load: async () => {
      const s = await goodConductAdminApi.getReports();
      return [
        { label: 'Total requests', value: num(s.total) },
        { label: 'Revenue', value: rwf(s.revenue) },
      ];
    },
  },
  {
    key: 'tenders',
    title: 'Tenders',
    description: 'Bids submitted and value awarded.',
    href: '/admin/tenders/reports',
    icon: Briefcase,
    accent: 'text-teal-600',
    bg: 'bg-teal-50',
    permission: Permission.TENDER_REPORTS,
    load: async () => {
      const s = await tenderApplicationAdminApi.getReports();
      return [
        { label: 'Total bids', value: num(s.total) },
        { label: 'Awarded value', value: rwf(s.awardedValue) },
      ];
    },
  },
  {
    key: 'donations',
    title: 'Donations',
    description: 'Contributions received across campaigns.',
    href: '/admin/donations',
    icon: Wallet,
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50',
    permission: Permission.DONATIONS_VIEW,
    load: async () => {
      const s = await donationsApi.admin.getStats();
      const receivedRwf = s.byCurrency?.find((c) => c.currency === 'RWF')?.received ?? 0;
      return [
        { label: 'Total donations', value: num(s.count) },
        { label: 'Received (RWF)', value: rwf(receivedRwf) },
      ];
    },
  },
];

type DomainState = { loading: boolean; error: boolean; metrics: Metric[] };

function AdminReportsContent() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();

  const visibleDomains = DOMAINS.filter((d) => hasPermission(d.permission));
  const [state, setState] = useState<Record<string, DomainState>>(() =>
    Object.fromEntries(
      visibleDomains.map((d) => [d.key, { loading: true, error: false, metrics: [] }]),
    ),
  );

  useEffect(() => {
    let cancelled = false;
    // Each domain loads independently — one failing report never blocks the others.
    visibleDomains.forEach((d) => {
      d.load()
        .then((metrics) => {
          if (!cancelled) setState((p) => ({ ...p, [d.key]: { loading: false, error: false, metrics } }));
        })
        .catch(() => {
          if (!cancelled) setState((p) => ({ ...p, [d.key]: { loading: false, error: true, metrics: [] } }));
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-400">
            Service activity at a glance. Open a service for full filtering and CSV export.
          </p>
        </div>
      </div>

      {visibleDomains.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">You don&apos;t have access to any service reports yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleDomains.map((d) => {
            const s = state[d.key] ?? { loading: true, error: false, metrics: [] };
            const Icon = d.icon;
            return (
              <div
                key={d.key}
                className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${d.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${d.accent}`} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900">{d.title}</h2>
                    <p className="text-xs text-gray-400">{d.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {s.loading ? (
                    <div className="col-span-2 flex items-center gap-2 text-gray-400 text-sm py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                  ) : s.error ? (
                    <div className="col-span-2 text-sm text-gray-400 py-2">
                      Couldn&apos;t load these figures.
                    </div>
                  ) : (
                    s.metrics.map((m) => (
                      <div key={m.label} className="rounded-lg bg-gray-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          {m.label}
                        </p>
                        <p className="text-base font-bold text-gray-900 mt-0.5">{m.value}</p>
                      </div>
                    ))
                  )}
                </div>

                <Link
                  href={`/${locale}${d.href}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:gap-2.5 transition-all"
                >
                  Open &amp; export <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
