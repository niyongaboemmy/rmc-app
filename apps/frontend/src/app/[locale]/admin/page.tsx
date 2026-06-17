'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import {
  Users, UserCheck, Clock, CheckCircle2, XCircle, Landmark,
  TrendingUp, TrendingDown, ArrowUpRight, RefreshCw,
  Activity, Minus,
} from 'lucide-react';

/* ─── Animated count-up ─── */
function useCountUp(target: number, duration = 900, active = false) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active || target === 0) { setV(target); return; }
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);
  return v;
}

/* ─── Stat card ─── */
interface StatProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: number;
  href?: string;
  active: boolean;
  delay?: number;
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, trend, href, active, delay = 0 }: StatProps) {
  const count = useCountUp(value, 900, active);

  const inner = (
    <div
      className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${
            trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trend !== 0 ? `${Math.abs(trend)}%` : 'flat'}
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-gray-900 tabular-nums">{count.toLocaleString()}</p>
      <p className="text-[12px] text-gray-500 mt-0.5">{label}</p>

      {href && (
        <div className="flex items-center gap-0.5 mt-3 text-[11px] font-medium text-gray-400 group-hover:text-rmc-green transition-colors">
          View all <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ─── Bar chart ─── */
function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div
            className="w-full rounded-t-sm bg-rmc-green/15 group-hover:bg-rmc-green/30 transition-colors duration-150 relative overflow-hidden"
            style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-rmc-green rounded-t-sm transition-all duration-500"
              style={{ height: `${(v / max) * 60 + 40}%` }}
            />
          </div>
          <span className="text-[9px] text-gray-300 group-hover:text-gray-500 transition-colors">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Activity item ─── */
interface ActivityItemProps {
  initials: string;
  name: string;
  action: string;
  time: string;
  status: 'approved' | 'pending' | 'rejected';
}

const STATUS_STYLES = {
  approved: 'text-emerald-600 bg-emerald-50',
  pending:  'text-amber-600 bg-amber-50',
  rejected: 'text-red-500 bg-red-50',
};

function ActivityItem({ initials, name, action, time, status }: ActivityItemProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-gray-800 truncate">{name}</p>
        <p className="text-[11px] text-gray-400 truncate">{action}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${STATUS_STYLES[status]}`}>
          {status}
        </span>
        <span className="text-[10px] text-gray-300">{time}</span>
      </div>
    </div>
  );
}

/* ─── Status dot ─── */
function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-[12px] text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span className={`text-[11px] font-medium ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
          {ok ? 'Operational' : 'Down'}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════ PAGE ═══════════════════════ */
export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const { locale } = useParams<{ locale: string }>();
  const { user } = useAuth();

  const [stats, setStats] = useState({ totalMembers: 0, pendingMembers: 0, approvedMembers: 0, rejectedMembers: 0, totalMosques: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const WEEKLY_DATA   = [12, 19, 8, 24, 17, 31, 22];
  const WEEKLY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const fetchStats = async () => {
    try {
      const [mRes, mqRes, uRes] = await Promise.allSettled([
        apiClient.get('/members?limit=1'),
        apiClient.get('/mosques?limit=1'),
        apiClient.get('/users?limit=1'),
      ]);
      setStats({
        totalMembers:    mRes.status === 'fulfilled'  ? (mRes.value.data?.data?.total  ?? 0) : 0,
        pendingMembers:  0,
        approvedMembers: 0,
        rejectedMembers: 0,
        totalMosques:    mqRes.status === 'fulfilled' ? (mqRes.value.data?.data?.total ?? 0) : 0,
        totalUsers:      uRes.status === 'fulfilled'  ? (uRes.value.data?.data?.total  ?? 0) : 0,
      });
    } finally {
      setLoading(false);
      setTimeout(() => setCardsVisible(true), 80);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCardsVisible(false);
    await fetchStats();
    setRefreshing(false);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const STAT_CARDS: Omit<StatProps, 'active'>[] = [
    { label: t('dashboard.totalMembers'),    value: stats.totalMembers,    icon: Users,        iconBg: 'bg-violet-50',       iconColor: 'text-violet-500',  trend: 12, href: `/${locale}/admin/members` },
    { label: t('dashboard.pendingApproval'), value: stats.pendingMembers,  icon: Clock,        iconBg: 'bg-amber-50',        iconColor: 'text-amber-500',   trend: -3, href: `/${locale}/admin/members` },
    { label: t('dashboard.approved'),        value: stats.approvedMembers, icon: CheckCircle2, iconBg: 'bg-emerald-50',      iconColor: 'text-emerald-500', trend: 8                                   },
    { label: t('dashboard.rejected'),        value: stats.rejectedMembers, icon: XCircle,      iconBg: 'bg-red-50',          iconColor: 'text-red-400',     trend: 0                                   },
    { label: t('dashboard.totalMosques'),    value: stats.totalMosques,    icon: Landmark,     iconBg: 'bg-sky-50',          iconColor: 'text-sky-500',               href: `/${locale}/admin/mosques` },
    { label: t('dashboard.totalUsers'),      value: stats.totalUsers,      icon: UserCheck,    iconBg: 'bg-green-50',        iconColor: 'text-green-600',             href: `/${locale}/admin/users`   },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-56 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
            {greeting}, <span className="text-rmc-green">{user?.firstName}</span>
          </h1>
          <p className="text-[12px] sm:text-[13px] text-gray-400 mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAT_CARDS.map((card, i) => (
          <StatCard key={card.label} {...card} active={cardsVisible} delay={i * 60} />
        ))}
      </div>

      {/* Middle: chart + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4 sm:mb-5">
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Weekly Registrations</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Last 7 days</p>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
              <TrendingUp className="w-3 h-3" /> +18% vs last week
            </span>
          </div>

          <BarChart data={WEEKLY_DATA} labels={WEEKLY_LABELS} />

          <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-3 divide-x divide-gray-100">
            {[
              { label: 'Total this week', value: '133' },
              { label: 'Daily average',   value: '19'  },
              { label: 'Peak day',        value: 'Thu' },
            ].map(({ label, value }) => (
              <div key={label} className="px-3 sm:px-4 first:pl-0 last:pr-0">
                <p className="text-base sm:text-lg font-bold text-gray-900">{value}</p>
                <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="text-[13px] font-semibold text-gray-900 mb-3">Quick Actions</p>
          <div className="space-y-1">
            {[
              { label: 'Review pending members', href: `/${locale}/admin/members`, accent: 'text-rmc-green'   },
              { label: 'Manage users',           href: `/${locale}/admin/users`,   accent: 'text-sky-600'    },
              { label: 'Manage roles',           href: `/${locale}/admin/roles`,   accent: 'text-violet-600' },
              { label: 'View mosques',           href: `/${locale}/admin/mosques`, accent: 'text-amber-600'  },
            ].map(({ label, href, accent }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className={`text-[13px] font-medium ${accent}`}>{label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>

          {stats.pendingMembers > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                <p className="text-[11px] text-amber-700 font-medium flex-1 min-w-0">
                  {stats.pendingMembers} applications need review
                </p>
                <Link href={`/${locale}/admin/members`} className="text-[11px] text-amber-700 font-semibold hover:underline shrink-0">
                  Go →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: activity + system */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[13px] font-semibold text-gray-900">Recent Activity</p>
            <Link href={`/${locale}/admin/members`} className="text-[12px] text-rmc-green font-medium hover:underline">
              View all
            </Link>
          </div>
          <ActivityItem initials="AU" name="Amina Uwase"    action="Applied for Standard membership" time="2m"  status="pending"  />
          <ActivityItem initials="KM" name="Kalisa Mugabo"  action="Membership approved"             time="18m" status="approved" />
          <ActivityItem initials="NN" name="Niyonzima N."   action="Application rejected"            time="1h"  status="rejected" />
          <ActivityItem initials="FH" name="Fatuma Hassan"  action="Applied for Standard membership" time="2h"  status="pending"  />
          <ActivityItem initials="IB" name="Ibrahim Bakari" action="Membership approved"             time="3h"  status="approved" />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="text-[13px] font-semibold text-gray-900 mb-3 sm:mb-4">System Status</p>
          <StatusRow label="API Server"   ok={true} />
          <StatusRow label="PostgreSQL"   ok={true} />
          <StatusRow label="Auth Service" ok={true} />
          <StatusRow label="File Server"  ok={true} />
          <StatusRow label="Redis Cache"  ok={true} />

          <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold text-gray-700">All systems normal</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Last checked just now</p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% uptime
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
