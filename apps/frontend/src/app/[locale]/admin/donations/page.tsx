'use client';

import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  HandCoins, Search, RefreshCw, TrendingUp, Wallet, Clock, Receipt,
  Plus, Pencil, X, Download, Trophy, Layers, CheckCircle2, CalendarRange, Sparkles, ChevronDown, Upload,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import {
  donationsApi, Donation, DonationStats, CampaignWithStats,
  CampaignStatus, DonationStatus, UpdateDonationPayload, formatCurrency, STATUS_COLORS,
} from '@/lib/donationsApi';
import { fileUrl } from '@/lib/api';
import { generateImageVersions, uploadGalleryVersions } from '@/lib/galleryApi';
import { parseDonationMeta, metaLabels, type DonateTranslator } from '@/lib/donationMeta';
import { CATEGORIES, NIYYAH, METHODS } from '@/components/donate/donateData';
import { formatMoney, fundedPercent } from '@/components/activities/data';
import { cn } from '@/lib/utils';

type Tab = 'report' | 'programs';

interface Filters {
  dateFrom: string;
  dateTo: string;
  campaignId: string;
  status: string;
  search: string;
}
const EMPTY_FILTERS: Filters = { dateFrom: '', dateTo: '', campaignId: '', status: '', search: '' };

/* Client-side refinements derived from the donation message (stable meta keys). */
interface MetaFilters {
  category: string;
  niyyah: string;
  method: string;
}
const EMPTY_META: MetaFilters = { category: '', niyyah: '', method: '' };

const PRESET_KEYS = ['all', 'today', '7d', '30d', 'month', 'year'] as const;
const STATUS_KEYS = ['', 'completed', 'pending', 'failed', 'refunded'] as const;
const CATEGORY_KEYS = [...CATEGORIES.map((c) => c.key), 'general'];

function presetRange(key: string): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  const to = fmt(today);
  switch (key) {
    case 'today': return { dateFrom: fmt(today), dateTo: to };
    case '7d': { const d = new Date(today); d.setDate(d.getDate() - 6); return { dateFrom: fmt(d), dateTo: to }; }
    case '30d': { const d = new Date(today); d.setDate(d.getDate() - 29); return { dateFrom: fmt(d), dateTo: to }; }
    case 'month': return { dateFrom: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: to };
    case 'year': return { dateFrom: fmt(new Date(today.getFullYear(), 0, 1)), dateTo: to };
    default: return { dateFrom: '', dateTo: '' };
  }
}

/** Short, stable transaction reference derived from the donation id. */
function txnRef(id: string): string {
  return `TXN-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDonationsPage() {
  return (
    <ProtectedRoute permissions={[Permission.DONATIONS_VIEW]}>
      <DonationsAdmin />
    </ProtectedRoute>
  );
}

function DonationsAdmin() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.DONATIONS_MANAGE);
  const t = useTranslations('admin.donations');
  const td = useTranslations('donate') as unknown as DonateTranslator;

  const donorLabel = useCallback(
    (d: Donation) => (d.isAnonymous ? t('unknown') : d.donorName?.trim() || t('unknown')),
    [t],
  );
  const methodLabel = useCallback(
    (m?: string | null) => (m && td.has(`methods.${m}.title`) ? td(`methods.${m}.title`) : m ?? '—'),
    [td],
  );

  const [tab, setTab] = useState<Tab>('report');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [metaFilters, setMetaFilters] = useState<MetaFilters>(EMPTY_META);
  const [page, setPage] = useState(1);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<DonationStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [campaignModal, setCampaignModal] = useState<{ open: boolean; campaign: CampaignWithStats | null }>({ open: false, campaign: null });
  const [editDonation, setEditDonation] = useState<Donation | null>(null);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await donationsApi.admin.list({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        campaignId: filters.campaignId || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        page,
        limit: 20,
      });
      setDonations(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      console.error(err);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await donationsApi.admin.getStats({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        campaignId: filters.campaignId || undefined,
        status: filters.status || undefined,
      });
      setStats(s);
    } catch { /* ignore */ }
  }, [filters]);

  const fetchCampaigns = useCallback(async () => {
    try {
      setCampaigns(await donationsApi.admin.listCampaigns());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const refreshAll = () => { fetchDonations(); fetchStats(); fetchCampaigns(); };

  const patch = (p: Partial<Filters>) => { setFilters((f) => ({ ...f, ...p })); setPage(1); };
  const applyPreset = (key: string) => { setFilters((f) => ({ ...f, ...presetRange(key) })); setPage(1); };
  const activePreset = useMemo(
    () => PRESET_KEYS.find((k) => {
      const r = presetRange(k);
      return r.dateFrom === filters.dateFrom && r.dateTo === filters.dateTo;
    }),
    [filters.dateFrom, filters.dateTo],
  );
  const metaActive = !!(metaFilters.category || metaFilters.niyyah || metaFilters.method);
  const hasActiveFilters = useMemo(
    () => Object.values(filters).some(Boolean) || metaActive,
    [filters, metaActive],
  );

  // Client-side refinement of the loaded page by message-derived meta keys.
  const visible = useMemo(() => {
    if (!metaActive) return donations;
    return donations.filter((d) => {
      const m = parseDonationMeta(d.message);
      if (metaFilters.category && m.category !== metaFilters.category) return false;
      if (metaFilters.niyyah && m.niyyah !== metaFilters.niyyah) return false;
      if (metaFilters.method && d.paymentMethod !== metaFilters.method) return false;
      return true;
    });
  }, [donations, metaFilters, metaActive]);

  const clearAll = () => { setFilters(EMPTY_FILTERS); setMetaFilters(EMPTY_META); setPage(1); };

  // Headline figures (RWF is the primary currency; other currencies shown as a strip)
  const rwf = stats?.byCurrency.find((c) => c.currency === 'RWF');
  const otherCurrencies = stats?.byCurrency.filter((c) => c.currency !== 'RWF') ?? [];
  const topProgram = stats?.byProgram[0];

  const exportCsv = () => {
    const header = [t('col.transaction'), t('col.date'), t('col.donor'), t('editModal.donorEmail'), t('col.cause'), t('col.intention'), t('col.amount'), t('editModal.currency'), t('col.method')];
    const rows = visible.map((d) => {
      const ml = metaLabels(td, parseDonationMeta(d.message));
      const fund = ml.fund ?? d.campaign?.title ?? t('generalFund');
      const cause = ml.category ? `${ml.category} › ${fund}` : fund;
      return [
        txnRef(d.id),
        new Date(d.donatedAt).toISOString().slice(0, 10),
        donorLabel(d),
        d.isAnonymous ? '' : d.donorEmail ?? '',
        cause,
        ml.niyyah ?? '',
        String(d.amount),
        d.currency,
        methodLabel(d.paymentMethod),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rmc-green/10 flex items-center justify-center shrink-0">
            <HandCoins className="w-5 h-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'report' && (
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
            >
              <Download className="w-4 h-4" /> {t('export')}
            </button>
          )}
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> {t('refresh')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Wallet className="w-5 h-5" />} color="text-rmc-green bg-rmc-green/10" label={t('stat.totalReceived')} value={formatCurrency('RWF', rwf?.received ?? 0)} />
        <StatCard icon={<Receipt className="w-5 h-5" />} color="text-blue-600 bg-blue-50" label={t('stat.totalDonations')} value={String(stats?.count ?? 0)} />
        <StatCard icon={<Trophy className="w-5 h-5" />} color="text-amber-600 bg-amber-50" label={t('stat.topProgram')} value={topProgram ? formatCurrency(topProgram.currency, topProgram.received) : '—'} sub={topProgram?.title} />
        <StatCard icon={<Clock className="w-5 h-5" />} color="text-yellow-600 bg-yellow-50" label={t('stat.pending')} value={formatCurrency('RWF', rwf?.pending ?? 0)} />
      </div>

      {/* Other-currency strip */}
      {otherCurrencies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {otherCurrencies.map((c) => (
            <span key={c.currency} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-100 px-3 py-1 text-xs text-gray-600">
              <TrendingUp className="w-3.5 h-3.5 text-rmc-green" />
              <span className="font-semibold text-gray-900">{formatCurrency(c.currency, c.received)}</span> {t('received')} · {c.count} {c.count === 1 ? t('gift') : t('gifts')}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        <TabButton active={tab === 'report'} onClick={() => setTab('report')} icon={<Receipt className="w-4 h-4" />} label={t('tabDonations')} count={total} />
        <TabButton active={tab === 'programs'} onClick={() => setTab('programs')} icon={<Layers className="w-4 h-4" />} label={t('tabPrograms')} count={campaigns.length} />
      </div>

      {tab === 'report' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {/* Quick time-range presets */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mr-1">
                <CalendarRange className="w-3.5 h-3.5" /> {t('period')}
              </span>
              {PRESET_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => applyPreset(k)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                    activePreset === k ? 'bg-rmc-green text-white border-rmc-green' : 'bg-white text-gray-600 border-gray-200 hover:border-rmc-green/40 hover:text-rmc-green',
                  )}
                >
                  {t(`preset.${k}`)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => patch({ search: e.target.value })}
                  className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green/40"
                />
              </div>
              <select value={filters.campaignId} onChange={(e) => patch({ campaignId: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 bg-white">
                <option value="">{t('allPrograms')}</option>
                <option value="general">{t('generalFund')}</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select value={filters.status} onChange={(e) => patch({ status: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 bg-white">
                {STATUS_KEYS.map((k) => <option key={k} value={k}>{k === '' ? t('status.all') : t(`status.${k}`)}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="date" value={filters.dateFrom} onChange={(e) => patch({ dateFrom: e.target.value })} className="w-full min-w-0 px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 text-gray-600" aria-label={t('fromDate')} />
                <span className="text-gray-300 text-xs">→</span>
                <input type="date" value={filters.dateTo} onChange={(e) => patch({ dateTo: e.target.value })} className="w-full min-w-0 px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 text-gray-600" aria-label={t('toDate')} />
              </div>
            </div>
            {/* Cause / intention / method (client-side) */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={metaFilters.category} onChange={(e) => setMetaFilters((m) => ({ ...m, category: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 bg-white">
                <option value="">{t('allCategories')}</option>
                {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{k === 'general' ? td('general.categoryTitle') : td(`categories.${k}.title`)}</option>)}
              </select>
              <select value={metaFilters.niyyah} onChange={(e) => setMetaFilters((m) => ({ ...m, niyyah: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 bg-white">
                <option value="">{t('allIntentions')}</option>
                {NIYYAH.map((n) => <option key={n.key} value={n.key}>{td(`niyyah.${n.key}.label`)}</option>)}
              </select>
              <select value={metaFilters.method} onChange={(e) => setMetaFilters((m) => ({ ...m, method: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 bg-white">
                <option value="">{t('allMethods')}</option>
                {METHODS.map((m) => <option key={m.key} value={m.key}>{td(`methods.${m.key}.title`)}</option>)}
              </select>
            </div>
            {hasActiveFilters && (
              <button onClick={clearAll} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-rmc-green transition-colors">
                <X className="w-3.5 h-3.5" /> {t('clearFilters')}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-rmc-green animate-spin" />
                <span className="ml-2 rtl:ml-0 rtl:mr-2 text-gray-500">{t('loading')}</span>
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center py-16">
                <HandCoins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">{t('noneTitle')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('noneHint')}</p>
              </div>
            ) : (
              <>
                {metaActive && (
                  <p className="px-4 pt-3 text-[11px] text-gray-400">{t('filteredNote', { count: visible.length })}</p>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-left rtl:text-right">
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('col.transaction')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('col.donor')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden sm:table-cell">{t('col.cause')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 text-right rtl:text-left">{t('col.amount')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden lg:table-cell">{t('col.method')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden md:table-cell">{t('col.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visible.map((d) => {
                      const meta = parseDonationMeta(d.message);
                      const ml = metaLabels(td, meta);
                      const fund = ml.fund ?? d.campaign?.title ?? t('generalFund');
                      const open = expandedId === d.id;
                      return (
                        <Fragment key={d.id}>
                          <tr
                            onClick={() => setExpandedId(open ? null : d.id)}
                            className={cn('cursor-pointer transition-colors align-top', open ? 'bg-rmc-green/5' : 'hover:bg-rmc-green/5')}
                          >
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-1.5">
                                <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform', open && 'rotate-180 text-rmc-green')} />
                                <span className="font-mono text-xs font-semibold text-gray-700 break-all" title={d.id}>{txnRef(d.id)}</span>
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-gray-900 break-words">{donorLabel(d)}</p>
                              {!d.isAnonymous && d.donorEmail && <p className="text-xs text-gray-400 break-all">{d.donorEmail}</p>}
                              <p className="sm:hidden mt-1 text-xs text-gray-500">{fund}{ml.niyyah ? ` · ${ml.niyyah}` : ''}</p>
                            </td>
                            <td className="px-4 py-4 hidden sm:table-cell">
                              <span className="text-gray-700">{fund}</span>
                              {ml.category && <span className="block text-[11px] text-gray-400">{ml.category}</span>}
                              <span className="mt-1 flex flex-wrap gap-1">
                                {ml.niyyah && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rmc-gold/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#8A6A0F]">
                                    <Sparkles className="w-2.5 h-2.5" />{ml.niyyah}
                                  </span>
                                )}
                                {d.frequency !== 'once' && (
                                  <span className="inline-flex items-center rounded-full bg-rmc-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-rmc-green">{t(`freq.${d.frequency}`)}</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right rtl:text-left font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                              {formatCurrency(d.currency, d.amount)}
                              <span className="md:hidden block mt-0.5 text-[11px] font-normal text-gray-400">
                                {new Date(d.donatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-gray-500 hidden lg:table-cell">{methodLabel(d.paymentMethod)}</td>
                            <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap hidden md:table-cell">
                              {new Date(d.donatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                          </tr>
                          {open && (
                            <tr className="bg-gray-50/60">
                              <td colSpan={6} className="px-4 pb-5 pt-1">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                                  <DetailField label={t('detail.reference')}>
                                    <span className="font-mono text-xs text-gray-700 break-all">{d.id}</span>
                                  </DetailField>
                                  <DetailField label={t('detail.status')}>
                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', STATUS_COLORS[d.status])}>{t(`status.${d.status}`)}</span>
                                  </DetailField>
                                  <DetailField label={t('detail.intention')}>{ml.niyyah ?? '—'}</DetailField>
                                  <DetailField label={t('detail.category')}>{ml.category ?? '—'}</DetailField>
                                  <DetailField label={t('detail.fund')}>{ml.fund ?? '—'}</DetailField>
                                  <DetailField label={t('detail.program')}>{d.campaign?.title ?? t('generalFund')}</DetailField>
                                  <DetailField label={t('detail.method')}>{methodLabel(d.paymentMethod)}</DetailField>
                                  <DetailField label={t('detail.frequency')}>{t(`freq.${d.frequency}`)}</DetailField>
                                  <DetailField label={t('detail.email')}>
                                    {d.isAnonymous ? t('detail.anonymous') : d.donorEmail || '—'}
                                  </DetailField>
                                  <DetailField label={t('detail.date')}>
                                    {new Date(d.donatedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                                  </DetailField>
                                </div>
                                {canManage && (
                                  <div className="mt-4 flex justify-end">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditDonation(d); }}
                                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
                                    >
                                      <Pencil className="w-4 h-4" /> {t('edit')}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {pages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      {t('showing', { from: (page - 1) * 20 + 1, to: Math.min(page * 20, total), total })}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rmc-green/40 transition-colors">{t('previous')}</button>
                      <button onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page === pages} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rmc-green/40 transition-colors">{t('next')}</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <ProgramsTab campaigns={campaigns} canManage={canManage} onNew={() => setCampaignModal({ open: true, campaign: null })} onEdit={(c) => setCampaignModal({ open: true, campaign: c })} />
      )}

      {/* Modals */}
      {campaignModal.open && (
        <CampaignModal campaign={campaignModal.campaign} onClose={() => setCampaignModal({ open: false, campaign: null })} onSaved={() => { setCampaignModal({ open: false, campaign: null }); refreshAll(); }} />
      )}
      {editDonation && (
        <EditDonationModal
          donation={editDonation}
          campaigns={campaigns}
          onClose={() => setEditDonation(null)}
          onSaved={() => { setEditDonation(null); refreshAll(); }}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
      <div className="text-[13px] text-gray-800 break-words">{children}</div>
    </div>
  );
}

function StatCard({ icon, color, label, value, sub }: { icon: React.ReactNode; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>{icon}</div>
      <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
        active ? 'border-rmc-green text-rmc-green' : 'border-transparent text-gray-500 hover:text-gray-800',
      )}
    >
      {icon} {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-rmc-green/10 text-rmc-green' : 'bg-gray-100 text-gray-500')}>{count}</span>
    </button>
  );
}

function ProgramsTab({ campaigns, canManage, onNew, onEdit }: {
  campaigns: CampaignWithStats[];
  canManage: boolean;
  onNew: () => void;
  onEdit: (c: CampaignWithStats) => void;
}) {
  const t = useTranslations('admin.donations');
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark transition-colors">
            <Plus className="w-4 h-4" /> {t('programs.new')}
          </button>
        </div>
      )}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t('programs.noneTitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const raised = Number(c.receivedAmount);
            const pct = fundedPercent(raised, c.targetAmount);
            const funded = pct >= 100;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-tight truncate">{c.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.fundType} · {c.donationCount} {c.donationCount === 1 ? t('programs.donation') : t('programs.donations')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CampaignStatusBadge status={c.status} />
                    {canManage && (
                      <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-rmc-green hover:bg-rmc-green/5 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-bold tabular-nums text-gray-900">
                    {c.currency} {formatMoney(raised)}
                    <span className="font-medium text-gray-400"> / {formatMoney(c.targetAmount)}</span>
                  </span>
                  <span className={cn('inline-flex items-center gap-1 font-bold tabular-nums', funded ? 'text-[#8A6A0F]' : 'text-rmc-green')}>
                    {funded && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={cn('h-full rounded-full', funded ? 'bg-rmc-gold-light' : 'bg-rmc-green')} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {t('programs.raisedNote', { amount: formatCurrency(c.currency, raised) })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const t = useTranslations('admin.donations');
  const map: Record<CampaignStatus, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<CampaignStatus, string> = {
    active: t('programs.statusActive'),
    paused: t('programs.statusPaused'),
    closed: t('programs.statusClosed'),
  };
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', map[status])}>{labels[status]}</span>;
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green/40';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5';

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Resolve a stored hero image (file-server key, or a pass-through URL/path). */
function resolveImg(v: string): string {
  return /^https?:\/\//.test(v) || v.startsWith('/') ? v : fileUrl(v);
}

/* Centered modal, portalled to <body> so it overlays the whole viewport
   (escaping the admin content area's positioning/transform context). */
function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-6 animate-overlay-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-modal-in"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 sm:px-6 py-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-6 space-y-8">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 sm:px-6 py-4 shrink-0">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

/* A labelled form section. */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, required, children }: { label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mb-6 flex items-center">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={label}>
            <div className="flex min-w-0 items-center gap-2">
              <span className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 transition-colors',
                active ? 'bg-rmc-green text-white ring-rmc-green' : done ? 'bg-rmc-green/10 text-rmc-green ring-rmc-green/20' : 'bg-gray-100 text-gray-400 ring-gray-200',
              )}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('hidden truncate text-xs font-semibold sm:block', active ? 'text-gray-900' : 'text-gray-400')}>{label}</span>
            </div>
            {i < steps.length - 1 && <span className={cn('mx-2 h-px flex-1', done ? 'bg-rmc-green/40' : 'bg-gray-200')} />}
          </Fragment>
        );
      })}
    </div>
  );
}

function CampaignModal({ campaign, onClose, onSaved }: {
  campaign: CampaignWithStats | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('admin.donations');
  const td = useTranslations('donate') as unknown as DonateTranslator;
  const isEdit = !!campaign;

  const [title, setTitle] = useState(campaign?.title ?? '');
  const [slug, setSlug] = useState(campaign?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!campaign?.slug);
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [heroImageUrl, setHeroImageUrl] = useState(campaign?.heroImageUrl ?? '');
  const [targetAmount, setTargetAmount] = useState(String(campaign?.targetAmount ?? ''));
  const [currency, setCurrency] = useState(campaign?.currency ?? 'RWF');
  const [fundType, setFundType] = useState(campaign?.fundType ?? 'general');
  const [startDate, setStartDate] = useState(campaign?.startDate ?? '');
  const [endDate, setEndDate] = useState(campaign?.endDate ?? '');
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErr, setFieldErr] = useState<{ title?: string; targetAmount?: string; heroImage?: string }>({});

  const statusLabels: Record<CampaignStatus, string> = {
    active: t('programs.statusActive'),
    paused: t('programs.statusPaused'),
    closed: t('programs.statusClosed'),
  };

  // Category options — donate-page categories, keeping any legacy fundType value.
  const catKeys = CATEGORY_KEYS.includes(fundType) ? CATEGORY_KEYS : [fundType, ...CATEGORY_KEYS];
  const catLabel = (k: string) =>
    k === 'general' ? td('general.categoryTitle') : td.has(`categories.${k}.title`) ? td(`categories.${k}.title`) : k;

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const onPickImage = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFieldErr((p) => ({ ...p, heroImage: t('campaignModal.invalidImageFile') }));
      return;
    }
    setUploadingImg(true);
    setFieldErr((p) => ({ ...p, heroImage: undefined }));
    try {
      const versions = await generateImageVersions(file);
      const { fileKey } = await uploadGalleryVersions({ versions });
      setHeroImageUrl(fileKey);
    } catch {
      setFieldErr((p) => ({ ...p, heroImage: t('campaignModal.uploadFailed') }));
    } finally {
      setUploadingImg(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const STEPS = [
    { key: 'basics', title: t('campaignModal.basics') },
    { key: 'funding', title: t('campaignModal.funding') },
    { key: 'schedule', title: t('campaignModal.schedule') },
  ];
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  const validateStep = (s: number) => {
    const fe: typeof fieldErr = {};
    if (s === 0 && !title.trim()) fe.title = t('campaignModal.required');
    if (s === 1 && (!targetAmount || Number(targetAmount) <= 0)) fe.targetAmount = t('campaignModal.invalidAmount');
    return fe;
  };

  const goNext = () => {
    const fe = validateStep(step);
    setFieldErr(fe);
    if (!Object.keys(fe).length) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const save = async () => {
    const fe = { ...validateStep(0), ...validateStep(1) };
    setFieldErr(fe);
    if (fe.title || fe.heroImage) { setStep(0); return; }
    if (fe.targetAmount) { setStep(1); return; }

    setSaving(true);
    setError('');
    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description: description.trim(),
      heroImageUrl: heroImageUrl.trim() || null,
      targetAmount: Number(targetAmount),
      currency,
      fundType,
      startDate: startDate || undefined,
      endDate: endDate || null,
      status,
    };
    try {
      if (isEdit && campaign) await donationsApi.admin.updateCampaign(campaign.id, payload);
      else await donationsApi.admin.createCampaign(payload);
      onSaved();
    } catch {
      setError(t('campaignModal.error'));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? t('campaignModal.editTitle') : t('campaignModal.newTitle')}
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button onClick={step === 0 ? onClose : () => setStep((s) => s - 1)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            {step === 0 ? t('campaignModal.cancel') : t('campaignModal.back')}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400">{t('campaignModal.step', { current: step + 1, total: STEPS.length })}</span>
            {last ? (
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark disabled:opacity-50">
                {saving ? t('campaignModal.saving') : isEdit ? t('campaignModal.save') : t('campaignModal.create')}
              </button>
            ) : (
              <button onClick={goNext} className="px-5 py-2 rounded-xl bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark">
                {t('campaignModal.next')}
              </button>
            )}
          </div>
        </div>
      }
    >
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <Stepper steps={STEPS.map((s) => s.title)} current={step} />

      {step === 0 && (
      <FormSection title={t('campaignModal.basics')}>
        <Field label={t('campaignModal.title')} required error={fieldErr.title}>
          <input value={title} onChange={(e) => onTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('campaignModal.slug')} hint={t('campaignModal.slugHint')}>
          <input
            value={slug}
            onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
            placeholder="e1"
            className={cn(inputClass, 'font-mono')}
          />
        </Field>
        <Field label={t('campaignModal.description')}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </Field>
        <Field label={t('campaignModal.heroImage')} hint={t('campaignModal.heroImageHint')} error={fieldErr.heroImage}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0])} />
          {heroImageUrl ? (
            <div className="relative h-44 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImg(heroImageUrl)} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/50 to-transparent p-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-white">{t('campaignModal.uploadImage')}</button>
                <button type="button" onClick={() => setHeroImageUrl('')} className="rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-white">{t('campaignModal.removeImage')}</button>
              </div>
              {uploadingImg && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <RefreshCw className="h-6 w-6 animate-spin text-rmc-green" />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImg}
              className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:opacity-60"
            >
              {uploadingImg ? (
                <>
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-[12px]">{t('campaignModal.uploading')}</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span className="text-[12px] font-semibold">{t('campaignModal.uploadImage')}</span>
                  <span className="text-[11px] text-gray-400">{t('campaignModal.optional')}</span>
                </>
              )}
            </button>
          )}
        </Field>
      </FormSection>
      )}

      {step === 1 && (
      <FormSection title={t('campaignModal.funding')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t('campaignModal.targetAmount')} required error={fieldErr.targetAmount}>
            <input type="number" min={0} value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className={inputClass} />
          </Field>
          <Field label={t('campaignModal.currency')}>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
              {['RWF', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label={t('campaignModal.category')} hint={t('campaignModal.categoryHint')}>
            <select value={fundType} onChange={(e) => setFundType(e.target.value)} className={inputClass}>
              {catKeys.map((k) => <option key={k} value={k}>{catLabel(k)}</option>)}
            </select>
          </Field>
        </div>
      </FormSection>
      )}

      {step === 2 && (
      <FormSection title={t('campaignModal.schedule')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t('campaignModal.startDate')}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label={t('campaignModal.endDate')}>
            <input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label={t('campaignModal.status')}>
            <select value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)} className={inputClass}>
              {(['active', 'paused', 'closed'] as CampaignStatus[]).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </Field>
        </div>
      </FormSection>
      )}
    </ModalShell>
  );
}

const EDIT_STATUSES: DonationStatus[] = ['completed', 'pending', 'failed', 'refunded'];
const EDIT_CURRENCIES = ['RWF', 'USD', 'EUR', 'GBP'];

/* Edit a single donation — status, amount, currency, program and donor details.
   The donor's original intention/category/fund is shown read-only for context. */
function EditDonationModal({ donation, campaigns, onClose, onSaved }: {
  donation: Donation;
  campaigns: CampaignWithStats[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('admin.donations');
  const td = useTranslations('donate') as unknown as DonateTranslator;

  const [status, setStatus] = useState<DonationStatus>(donation.status);
  const [amount, setAmount] = useState(String(donation.amount));
  const [currency, setCurrency] = useState(donation.currency);
  const [campaignId, setCampaignId] = useState(donation.campaignId ?? '');
  const [donorName, setDonorName] = useState(donation.donorName ?? '');
  const [donorEmail, setDonorEmail] = useState(donation.donorEmail ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ml = metaLabels(td, parseDonationMeta(donation.message));
  const selection = [ml.niyyah, ml.category, ml.fund].filter(Boolean).join(' · ') || '—';

  const save = async () => {
    setSaving(true);
    setError('');
    // Only send fields that actually changed.
    const payload: UpdateDonationPayload = {};
    if (status !== donation.status) payload.status = status;
    if (Number(amount) !== donation.amount) payload.amount = Number(amount);
    if (currency !== donation.currency) payload.currency = currency;
    if ((campaignId || null) !== donation.campaignId) payload.campaignId = campaignId || null;
    if (donorName.trim() !== (donation.donorName ?? '')) payload.donorName = donorName.trim();
    if (donorEmail.trim() !== (donation.donorEmail ?? '')) payload.donorEmail = donorEmail.trim();

    if (Object.keys(payload).length === 0) { onClose(); return; }
    try {
      await donationsApi.admin.updateDonation(donation.id, payload);
      onSaved();
    } catch {
      setError(t('editModal.error'));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={t('editModal.title')}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            {t('editModal.cancel')}
          </button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark disabled:opacity-50">
            {saving ? t('editModal.saving') : t('editModal.save')}
          </button>
        </>
      }
    >
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <Field label={t('editModal.selection')}>
        <p className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 text-sm text-gray-700">{selection}</p>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('editModal.status')}>
          <select value={status} onChange={(e) => setStatus(e.target.value as DonationStatus)} className={inputClass}>
            {EDIT_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
        </Field>
        <Field label={t('editModal.program')}>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
            <option value="">{t('generalFund')}</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
        <Field label={t('editModal.amount')}>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('editModal.currency')}>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            {EDIT_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={t('editModal.donorName')}>
          <input value={donorName} onChange={(e) => setDonorName(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('editModal.donorEmail')}>
          <input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} className={inputClass} />
        </Field>
      </div>
    </ModalShell>
  );
}
