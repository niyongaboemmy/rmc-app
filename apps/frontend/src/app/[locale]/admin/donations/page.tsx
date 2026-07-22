'use client';

import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  HandCoins, Search, RefreshCw, TrendingUp, Wallet, Clock, Receipt,
  Plus, Pencil, Trash2, RotateCcw, X, Download, Trophy, Layers, CheckCircle2, CalendarRange, Sparkles, ChevronDown, Upload,
  LayoutDashboard, Heart, History, ChevronRight, Building2, MapPin, ArrowUpRight,
  ArrowUp, ArrowDown, ArrowUpDown, Activity, Loader2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import {
  donationsApi, Donation, DonationStats, CampaignWithStats,
  CampaignStatus, DonationStatus, UpdateDonationPayload, formatCurrency, STATUS_COLORS,
  type DonationSort, type SortOrder, type DailyPoint,
} from '@/lib/donationsApi';
import { marriageApi, MarriageApplication, AdminStats as MarriageStats } from '@/lib/marriageApi';
import { fileUrl } from '@/lib/api';
import { generateImageVersions, uploadGalleryVersions } from '@/lib/galleryApi';
import { parseDonationMeta, metaLabels, type DonateTranslator } from '@/lib/donationMeta';
import { NIYYAH, METHODS } from '@/components/donate/donateData';
import { CategoriesTab } from '@/components/admin/donations/CategoriesTab';
import { ConfirmModal } from '@/components/ui/Modal';
import { NotifySubscribersButton } from '@/components/admin/NotifySubscribersButton';
import { donationCategoriesApi, type AdminCategory } from '@/lib/donationCategoriesApi';
import { formatMoney, fundedPercent } from '@/components/activities/data';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { cn } from '@/lib/utils';

/** Top-level Finance sections (the requested submenu). */
type Section = 'overview' | 'donations' | 'marriage' | 'history';
/** Secondary tabs under the Donations section. */
type DonationsTab = 'transactions' | 'programs' | 'categories';
/** Sortable columns for the Marriage and Payment-History tables. */
type MarriageSort = 'date' | 'amount' | 'couple' | 'payment';
type HistSort = 'date' | 'amount' | 'payer' | 'status' | 'source';

const HISTORY_PAGE_SIZE = 15;

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
/** Localized title for an admin-managed category, falling back to EN then the key. */
const categoryTitle = (c: AdminCategory, locale: string) =>
  (locale === 'rw' ? c.titleRw : locale === 'ar' ? c.titleAr : c.titleEn) || c.titleEn || c.key;

/* Payment-status pill colours shared by the Marriage and Payment-History views. */
const PAY_BADGE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  processing: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  pending_cash: 'bg-yellow-100 text-yellow-700',
  unpaid: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};
const PAY_LABEL: Record<string, string> = {
  paid: 'Paid', completed: 'Completed', processing: 'Processing', pending: 'Pending',
  pending_cash: 'Cash Pending', unpaid: 'Unpaid', failed: 'Failed', refunded: 'Refunded',
};

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

/** Two-letter initials for a name, for donor/payer avatars. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return text || '?';
}

/** Compact "time ago" label for the realtime activity feed. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Unified ledger row spanning donation transactions and marriage payments. */
interface LedgerEntry {
  key: string;
  source: 'donation' | 'marriage';
  ref: string;
  payer: string;
  detail: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  date: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminFinancePage() {
  return (
    <ProtectedRoute permissions={[Permission.DONATIONS_VIEW]}>
      <FinanceAdmin />
    </ProtectedRoute>
  );
}

function FinanceAdmin() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.DONATIONS_MANAGE);
  const canViewMarriage = hasPermission(Permission.MARRIAGE_VIEW);
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

  const [section, setSection] = useState<Section>('overview');
  const [donTab, setDonTab] = useState<DonationsTab>('transactions');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [metaFilters, setMetaFilters] = useState<MetaFilters>(EMPTY_META);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DonationSort>('date');
  const [order, setOrder] = useState<SortOrder>('DESC');

  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<DonationStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);

  // Overview: live recent transactions + daily-received chart.
  const [recent, setRecent] = useState<Donation[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);

  // Marriage (finance view) — only loaded when the admin can see marriage data.
  const [marriageStats, setMarriageStats] = useState<MarriageStats | null>(null);
  const [marrApps, setMarrApps] = useState<MarriageApplication[]>([]);
  const [marrTotal, setMarrTotal] = useState(0);
  const [marrPages, setMarrPages] = useState(1);
  const [marrPage, setMarrPage] = useState(1);
  const [marrLoading, setMarrLoading] = useState(false);
  const [marrSearch, setMarrSearch] = useState('');
  const [marrPay, setMarrPay] = useState('');
  const [marrStatus, setMarrStatus] = useState('');
  const [marrFrom, setMarrFrom] = useState('');
  const [marrTo, setMarrTo] = useState('');
  const [marrSort, setMarrSort] = useState<MarriageSort>('date');
  const [marrOrder, setMarrOrder] = useState<SortOrder>('DESC');

  // Payment history — a combined ledger fetched lazily on first visit.
  const [histDon, setHistDon] = useState<Donation[]>([]);
  const [histMarr, setHistMarr] = useState<MarriageApplication[]>([]);
  const [histLoaded, setHistLoaded] = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [histSource, setHistSource] = useState<'' | 'donation' | 'marriage'>('');
  const [histSearch, setHistSearch] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [histSort, setHistSort] = useState<HistSort>('date');
  const [histOrder, setHistOrder] = useState<SortOrder>('DESC');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [campaignModal, setCampaignModal] = useState<{ open: boolean; campaign: CampaignWithStats | null }>({ open: false, campaign: null });
  const [editDonation, setEditDonation] = useState<Donation | null>(null);
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<CampaignWithStats | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState(false);

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
        sort,
        order,
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
  }, [filters, page, sort, order]);

  /** Latest transactions for the overview — unfiltered, polled in realtime. */
  const fetchRecent = useCallback(async () => {
    try {
      const res = await donationsApi.admin.list({ page: 1, limit: 8, sort: 'date', order: 'DESC' });
      setRecent(res.items);
    } catch { /* ignore */ }
  }, []);

  const fetchDaily = useCallback(async () => {
    try {
      const res = await donationsApi.admin.getDaily(30, 'RWF');
      setDaily(res.series);
    } catch { /* ignore */ }
  }, []);

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

  const fetchCategories = useCallback(async () => {
    try {
      setCategories(await donationCategoriesApi.admin.list());
    } catch (err) {
      // Surface refetch failures instead of silently swallowing them — a silent
      // failure here looks like "saved but the new category never appeared".
      console.error('Failed to load donation categories', err);
    }
  }, []);

  const fetchMarriageStats = useCallback(async () => {
    if (!canViewMarriage) return;
    try {
      setMarriageStats(await marriageApi.admin.getStats());
    } catch { /* ignore */ }
  }, [canViewMarriage]);

  const fetchMarriage = useCallback(async () => {
    if (!canViewMarriage) return;
    setMarrLoading(true);
    try {
      const res = await marriageApi.admin.list({
        search: marrSearch || undefined,
        paymentStatus: marrPay || undefined,
        status: marrStatus || undefined,
        dateFrom: marrFrom || undefined,
        dateTo: marrTo || undefined,
        sort: marrSort,
        order: marrOrder,
        page: marrPage,
        limit: 20,
      });
      setMarrApps(res.items);
      setMarrTotal(res.total);
      setMarrPages(res.pages);
    } catch (err) {
      console.error(err);
      setMarrApps([]);
    } finally {
      setMarrLoading(false);
    }
  }, [canViewMarriage, marrSearch, marrPay, marrStatus, marrFrom, marrTo, marrSort, marrOrder, marrPage]);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const [don, marr] = await Promise.all([
        donationsApi.admin.list({ page: 1, limit: 50 }),
        canViewMarriage ? marriageApi.admin.list({ page: 1, limit: 50 }) : Promise.resolve({ items: [] as MarriageApplication[] }),
      ]);
      setHistDon(don.items);
      setHistMarr((marr.items ?? []).filter((a) => Number(a.amountPaid) > 0 || a.paymentStatus === 'processing'));
      setHistLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setHistLoading(false);
    }
  }, [canViewMarriage]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchMarriageStats(); }, [fetchMarriageStats]);
  useEffect(() => { if (section === 'marriage') fetchMarriage(); }, [section, fetchMarriage]);
  useEffect(() => { if (section === 'history' && !histLoaded) fetchHistory(); }, [section, histLoaded, fetchHistory]);

  // Realtime overview: load immediately, then poll every 15s while it's open.
  useEffect(() => {
    if (section !== 'overview') return;
    fetchRecent();
    fetchDaily();
    const id = setInterval(() => { fetchRecent(); fetchDaily(); }, 15000);
    return () => clearInterval(id);
  }, [section, fetchRecent, fetchDaily]);

  const refreshAll = () => {
    fetchDonations(); fetchStats(); fetchCampaigns(); fetchCategories(); fetchMarriageStats();
    if (section === 'overview') { fetchRecent(); fetchDaily(); }
    if (section === 'marriage') fetchMarriage();
    if (section === 'history') fetchHistory();
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteCampaignTarget) return;
    setDeletingCampaign(true);
    try {
      await donationsApi.admin.deleteCampaign(deleteCampaignTarget.id);
      setDeleteCampaignTarget(null);
      refreshAll();
    } catch (err) {
      console.error('Failed to delete program', err);
    } finally {
      setDeletingCampaign(false);
    }
  };

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

  // Category filter options — dynamic from the admin-managed categories. Includes
  // inactive ones so historical donations to them stay filterable, plus the general fund.
  const categoryFilterOptions = useMemo(() => [
    { key: 'general', label: td('general.categoryTitle') },
    ...[...categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ key: c.key, label: categoryTitle(c, locale) })),
  ], [categories, locale, td]);

  const clearAll = () => { setFilters(EMPTY_FILTERS); setMetaFilters(EMPTY_META); setPage(1); };

  // Headline figures (RWF is the primary currency; other currencies shown as a strip)
  const rwf = stats?.byCurrency.find((c) => c.currency === 'RWF');
  const otherCurrencies = stats?.byCurrency.filter((c) => c.currency !== 'RWF') ?? [];
  const topProgram = stats?.byProgram[0];
  const marriageRevenue = Number(marriageStats?.revenue ?? 0);
  const combinedRevenue = (rwf?.received ?? 0) + marriageRevenue;

  // Combined, date-sorted ledger for the Payment History view.
  const ledger = useMemo<LedgerEntry[]>(() => {
    const fromDonations: LedgerEntry[] = histDon.map((d) => ({
      key: `d-${d.id}`,
      source: 'donation',
      ref: txnRef(d.id),
      payer: d.isAnonymous ? t('unknown') : d.donorName?.trim() || t('unknown'),
      detail: metaLabels(td, parseDonationMeta(d.message)).fund ?? d.campaign?.title ?? t('generalFund'),
      amount: Number(d.amount),
      currency: d.currency,
      method: methodLabel(d.paymentMethod),
      status: d.status,
      date: d.donatedAt,
    }));
    const fromMarriage: LedgerEntry[] = histMarr.map((a) => ({
      key: `m-${a.id}`,
      source: 'marriage',
      ref: a.applicationNumber,
      payer: `${a.groomName} & ${a.brideName}`,
      detail: 'Marriage service',
      amount: Number(a.amountPaid) || Number(a.amountDue),
      currency: 'RWF',
      method: a.paymentMethod ?? '—',
      status: a.paymentStatus,
      date: a.updatedAt ?? a.createdAt,
    }));
    let all = [...fromDonations, ...fromMarriage];
    if (histSource) all = all.filter((e) => e.source === histSource);
    if (histSearch.trim()) {
      const q = histSearch.trim().toLowerCase();
      all = all.filter((e) => e.payer.toLowerCase().includes(q) || e.ref.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q));
    }
    const dir = histOrder === 'ASC' ? 1 : -1;
    all.sort((a, b) => {
      let cmp: number;
      switch (histSort) {
        case 'amount': cmp = a.amount - b.amount; break;
        case 'payer': cmp = a.payer.localeCompare(b.payer); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'source': cmp = a.source.localeCompare(b.source); break;
        default: cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return cmp * dir;
    });
    return all;
  }, [histDon, histMarr, histSource, histSearch, histSort, histOrder, t, td, methodLabel]);

  // Paginate the (already filtered + sorted) ledger client-side.
  const histPages = Math.max(1, Math.ceil(ledger.length / HISTORY_PAGE_SIZE));
  const histClampedPage = Math.min(histPage, histPages);
  const ledgerPage = ledger.slice((histClampedPage - 1) * HISTORY_PAGE_SIZE, histClampedPage * HISTORY_PAGE_SIZE);

  // Sort handlers — toggle direction on the active column, default DESC otherwise.
  const onSortDonations = (key: string) => {
    setOrder((o) => (sort === key ? (o === 'ASC' ? 'DESC' : 'ASC') : 'DESC'));
    setSort(key as DonationSort);
    setPage(1);
  };
  const onSortMarriage = (key: string) => {
    setMarrOrder((o) => (marrSort === key ? (o === 'ASC' ? 'DESC' : 'ASC') : 'DESC'));
    setMarrSort(key as MarriageSort);
    setMarrPage(1);
  };
  const onSortHistory = (key: string) => {
    setHistOrder((o) => (histSort === key ? (o === 'ASC' ? 'DESC' : 'ASC') : 'DESC'));
    setHistSort(key as HistSort);
    setHistPage(1);
  };

  /**
   * Export whichever report the admin is looking at, as a spreadsheet.
   *
   * Both are built by the backend over the *whole* filtered data set. The old CSV
   * was written from the rows already in memory, which is only the current 20-row
   * page (and, for the ledger, the 50 most recent of each source) — so on any real
   * database it silently produced a truncated file.
   */
  const exportReport = async () => {
    setExporting(true);
    try {
      if (section === 'history') {
        await donationsApi.admin.exportPaymentsXlsx({ source: histSource, search: histSearch });
      } else {
        await donationsApi.admin.exportXlsx({ ...filters, ...metaFilters });
      }
    } catch (err) {
      console.error(err);
      setExportError(t('exportError'));
    } finally {
      setExporting(false);
    }
  };

  const showExport =
    (section === 'donations' && donTab === 'transactions') || section === 'history';

  const SECTIONS: { key: Section; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'donations', label: 'Donations', icon: <HandCoins className="w-4 h-4" /> },
    { key: 'marriage', label: 'Marriage', icon: <Heart className="w-4 h-4" />, hidden: !canViewMarriage },
    { key: 'history', label: 'Payment History', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-deep flex items-center justify-center shrink-0 shadow-sm shadow-rmc-green/30">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Finance</h1>
            <p className="text-sm text-gray-500">Donations, marriage payments &amp; transaction history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showExport && (
            <button
              onClick={() => void exportReport()}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t('export')}
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

      {exportError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{exportError}</p>
      )}

      {/* Submenu */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-100">
        {SECTIONS.filter((s) => !s.hidden).map((s) => (
          <SubNavItem key={s.key} active={section === s.key} onClick={() => setSection(s.key)} icon={s.icon} label={s.label} />
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────── */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Wallet className="w-5 h-5" />} color="text-rmc-green bg-rmc-green/10" label="Total revenue" value={formatCurrency('RWF', combinedRevenue)} sub="Donations + marriage" />
            <StatCard icon={<HandCoins className="w-5 h-5" />} color="text-blue-600 bg-blue-50" label="Donations received" value={formatCurrency('RWF', rwf?.received ?? 0)} sub={`${stats?.count ?? 0} gifts`} />
            <StatCard icon={<Heart className="w-5 h-5" />} color="text-rose-600 bg-rose-50" label="Marriage revenue" value={formatCurrency('RWF', marriageRevenue)} sub={canViewMarriage ? `${marriageStats?.total ?? 0} applications` : 'No access'} />
            <StatCard icon={<Clock className="w-5 h-5" />} color="text-yellow-600 bg-yellow-50" label="Donations pending" value={formatCurrency('RWF', rwf?.pending ?? 0)} />
          </div>

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

          {/* Daily money received */}
          <DailyReceivedChart data={daily} currency="RWF" locale={locale} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Funds & programs */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Layers className="w-4 h-4 text-rmc-green" /> Funds &amp; programs</h2>
                <button onClick={() => { setSection('donations'); setDonTab('programs'); }} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-rmc-green transition-colors">
                  Manage <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {campaigns.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">{t('programs.noneTitle')}</p>
              ) : (
                <div className="space-y-4">
                  {campaigns.slice(0, 5).map((c) => {
                    const raised = Number(c.receivedAmount);
                    const pct = fundedPercent(raised, c.targetAmount);
                    const funded = pct >= 100;
                    return (
                      <div key={c.id}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                          <span className="font-medium text-gray-800 truncate">{c.title}</span>
                          <span className={cn('inline-flex items-center gap-1 font-bold tabular-nums shrink-0', funded ? 'text-[#8A6A0F]' : 'text-rmc-green')}>
                            {funded && <CheckCircle2 className="h-3.5 w-3.5" />}{pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className={cn('h-full rounded-full transition-all duration-700', funded ? 'bg-gradient-to-r from-rmc-gold to-rmc-gold-light' : 'bg-gradient-to-r from-rmc-green to-rmc-green-dark')} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400 tabular-nums">
                          {c.currency} {formatMoney(raised)} / {formatMoney(c.targetAmount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent activity — realtime */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Receipt className="w-4 h-4 text-rmc-green" /> Recent transactions</h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rmc-green">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rmc-green/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rmc-green" />
                  </span>
                  Live
                </span>
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">{t('noneTitle')}</p>
              ) : (
                <ul className="space-y-1">
                  {recent.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 transition-colors hover:bg-gray-50">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rmc-green/10 text-[11px] font-bold text-rmc-green">{initials(donorLabel(d))}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-gray-900 truncate">{donorLabel(d)}</p>
                        <p className="text-[11px] text-gray-400">
                          {relativeTime(d.donatedAt)} · <span className={cn('font-medium', d.status === 'completed' ? 'text-rmc-green' : d.status === 'pending' ? 'text-yellow-600' : 'text-gray-400')}>{t(`status.${d.status}`)}</span>
                        </p>
                      </div>
                      <span className="text-[13px] font-semibold text-gray-900 tabular-nums whitespace-nowrap">{formatCurrency(d.currency, d.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button onClick={() => { setSection('donations'); setDonTab('transactions'); }} className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-gray-100 py-2 text-xs font-medium text-gray-500 hover:border-rmc-green/40 hover:text-rmc-green transition-colors">
                View all transactions <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Donations ────────────────────────────────────────────────── */}
      {section === 'donations' && (
        <div className="space-y-6">
          {/* Donation stats (respond to the filters below) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Wallet className="w-5 h-5" />} color="text-rmc-green bg-rmc-green/10" label={t('stat.totalReceived')} value={formatCurrency('RWF', rwf?.received ?? 0)} />
            <StatCard icon={<Receipt className="w-5 h-5" />} color="text-blue-600 bg-blue-50" label={t('stat.totalDonations')} value={String(stats?.count ?? 0)} />
            <StatCard icon={<Trophy className="w-5 h-5" />} color="text-amber-600 bg-amber-50" label={t('stat.topProgram')} value={topProgram ? formatCurrency(topProgram.currency, topProgram.received) : '—'} sub={topProgram?.title} />
            <StatCard icon={<Clock className="w-5 h-5" />} color="text-yellow-600 bg-yellow-50" label={t('stat.pending')} value={formatCurrency('RWF', rwf?.pending ?? 0)} />
          </div>

          {/* Secondary tabs */}
          <div className="flex items-center gap-1 border-b border-gray-100">
            <TabButton active={donTab === 'transactions'} onClick={() => setDonTab('transactions')} icon={<Receipt className="w-4 h-4" />} label={t('tabDonations')} count={total} />
            <TabButton active={donTab === 'programs'} onClick={() => setDonTab('programs')} icon={<Layers className="w-4 h-4" />} label={t('tabPrograms')} count={campaigns.length} />
            <TabButton active={donTab === 'categories'} onClick={() => setDonTab('categories')} icon={<Sparkles className="w-4 h-4" />} label={t('tabCategories')} count={categories.length} />
          </div>

          {donTab === 'transactions' ? (
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
                  <SearchableSelect
                    value={filters.campaignId}
                    onChange={(v) => patch({ campaignId: v })}
                    options={[
                      { value: '', label: t('allPrograms') },
                      { value: 'general', label: t('generalFund') },
                      ...campaigns.map((c) => ({ value: c.id, label: c.title })),
                    ]}
                    searchPlaceholder={t('searchPlaceholder')}
                    triggerClassName="px-3 py-2.5 rounded-xl text-sm"
                  />
                  <SearchableSelect
                    value={filters.status}
                    onChange={(v) => patch({ status: v })}
                    options={STATUS_KEYS.map((k) => ({
                      value: k,
                      label: k === '' ? t('status.all') : t(`status.${k}`),
                    }))}
                    triggerClassName="px-3 py-2.5 rounded-xl text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input type="date" value={filters.dateFrom} onChange={(e) => patch({ dateFrom: e.target.value })} className="w-full min-w-0 px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 text-gray-600" aria-label={t('fromDate')} />
                    <span className="text-gray-300 text-xs">→</span>
                    <input type="date" value={filters.dateTo} onChange={(e) => patch({ dateTo: e.target.value })} className="w-full min-w-0 px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 text-gray-600" aria-label={t('toDate')} />
                  </div>
                </div>
                {/* Cause / intention / method (client-side) */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <SearchableSelect
                    value={metaFilters.category}
                    onChange={(v) => setMetaFilters((m) => ({ ...m, category: v }))}
                    options={[
                      { value: '', label: t('allCategories') },
                      ...categoryFilterOptions.map((o) => ({ value: o.key, label: o.label })),
                    ]}
                    triggerClassName="px-3 py-2.5 rounded-xl text-sm"
                  />
                  <SearchableSelect
                    value={metaFilters.niyyah}
                    onChange={(v) => setMetaFilters((m) => ({ ...m, niyyah: v }))}
                    options={[
                      { value: '', label: t('allIntentions') },
                      ...NIYYAH.map((n) => ({ value: n.key, label: td(`niyyah.${n.key}.label`) })),
                    ]}
                    triggerClassName="px-3 py-2.5 rounded-xl text-sm"
                  />
                  <SearchableSelect
                    value={metaFilters.method}
                    onChange={(v) => setMetaFilters((m) => ({ ...m, method: v }))}
                    options={[
                      { value: '', label: t('allMethods') },
                      ...METHODS.map((m) => ({ value: m.key, label: td(`methods.${m.key}.title`) })),
                    ]}
                    triggerClassName="px-3 py-2.5 rounded-xl text-sm"
                  />
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50 text-left rtl:text-right">
                            <th className="px-4 py-3.5 font-medium text-gray-600">{t('col.transaction')}</th>
                            <SortHeader label={t('col.donor')} sortKey="donor" active={sort} order={order} onSort={onSortDonations} />
                            <th className="px-4 py-3.5 font-medium text-gray-600 hidden sm:table-cell">{t('col.cause')}</th>
                            <SortHeader label={t('detail.status')} sortKey="status" active={sort} order={order} onSort={onSortDonations} />
                            <SortHeader label={t('col.amount')} sortKey="amount" active={sort} order={order} onSort={onSortDonations} align="right" />
                            <th className="px-4 py-3.5 font-medium text-gray-600 hidden lg:table-cell">{t('col.method')}</th>
                            <SortHeader label={t('col.date')} sortKey="date" active={sort} order={order} onSort={onSortDonations} className="hidden md:table-cell" />
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
                                    <div className="flex items-center gap-2.5">
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rmc-green/10 text-[11px] font-bold text-rmc-green">{initials(donorLabel(d))}</span>
                                      <div className="min-w-0">
                                        <p className="font-medium text-gray-900 break-words">{donorLabel(d)}</p>
                                        {!d.isAnonymous && d.donorEmail && <p className="text-xs text-gray-400 break-all">{d.donorEmail}</p>}
                                        <p className="sm:hidden mt-1 text-xs text-gray-500">{fund}{ml.niyyah ? ` · ${ml.niyyah}` : ''}</p>
                                      </div>
                                    </div>
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
                                  <td className="px-4 py-4">
                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', STATUS_COLORS[d.status])}>{t(`status.${d.status}`)}</span>
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
                                    <td colSpan={7} className="px-4 pb-5 pt-1">
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
                                {/* Editing a donation is disabled for now — restore this block to re-enable.
                                      {canManage && (
                                        <div className="mt-4 flex justify-end">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setEditDonation(d); }}
                                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
                                          >
                                            <Pencil className="w-4 h-4" /> {t('edit')}
                                          </button>
                                        </div>
                                      )} */}
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

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
          ) : donTab === 'programs' ? (
            <ProgramsTab campaigns={campaigns} canManage={canManage} onNew={() => setCampaignModal({ open: true, campaign: null })} onEdit={(c) => setCampaignModal({ open: true, campaign: c })} onDelete={(c) => setDeleteCampaignTarget(c)} onRestored={refreshAll} />
          ) : (
            <CategoriesTab categories={categories} canManage={canManage} onChanged={fetchCategories} />
          )}
        </div>
      )}

      {/* ── Marriage (finance view) ──────────────────────────────────── */}
      {section === 'marriage' && canViewMarriage && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Wallet className="w-5 h-5" />} color="text-rose-600 bg-rose-50" label="Marriage revenue" value={formatCurrency('RWF', marriageRevenue)} />
            <StatCard icon={<Heart className="w-5 h-5" />} color="text-blue-600 bg-blue-50" label="Applications" value={String(marriageStats?.total ?? 0)} />
            <StatCard icon={<CheckCircle2 className="w-5 h-5" />} color="text-green-600 bg-green-50" label="Approved" value={marriageStats?.byStatus.find((s) => s.status === 'approved')?.count ?? '0'} />
            <StatCard icon={<Clock className="w-5 h-5" />} color="text-yellow-600 bg-yellow-50" label="Awaiting review" value={marriageStats?.byStatus.find((s) => s.status === 'submitted')?.count ?? '0'} />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by couple or application number..."
                  value={marrSearch}
                  onChange={(e) => { setMarrSearch(e.target.value); setMarrPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
                />
              </div>
              <SearchableSelect
                value={marrStatus}
                onChange={(v) => { setMarrStatus(v); setMarrPage(1); }}
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'submitted', label: 'Submitted' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'cancelled', label: 'Cancelled' },
                  { value: 'closed', label: 'Closed' },
                ]}
                triggerClassName="px-3 py-2.5 rounded-xl text-sm focus:ring-rose-500/30"
              />
              <SearchableSelect
                value={marrPay}
                onChange={(v) => { setMarrPay(v); setMarrPage(1); }}
                options={[
                  { value: '', label: 'All payments' },
                  { value: 'unpaid', label: 'Unpaid' },
                  { value: 'pending_cash', label: 'Cash Pending' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'refunded', label: 'Refunded' },
                ]}
                triggerClassName="px-3 py-2.5 rounded-xl text-sm focus:ring-rose-500/30"
              />
              <div className="flex items-center gap-2">
                <input type="date" value={marrFrom} onChange={(e) => { setMarrFrom(e.target.value); setMarrPage(1); }} className="w-full min-w-0 px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-gray-600" aria-label="From date" />
                <span className="text-gray-300 text-xs">→</span>
                <input type="date" value={marrTo} onChange={(e) => { setMarrTo(e.target.value); setMarrPage(1); }} className="w-full min-w-0 px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-gray-600" aria-label="To date" />
              </div>
            </div>
            {(marrSearch || marrStatus || marrPay || marrFrom || marrTo) && (
              <button
                onClick={() => { setMarrSearch(''); setMarrStatus(''); setMarrPay(''); setMarrFrom(''); setMarrTo(''); setMarrPage(1); }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-rose-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {marrLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
                <span className="ml-2 text-gray-500">Loading applications...</span>
              </div>
            ) : marrApps.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No applications found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                        <SortHeader label="Application" sortKey="date" active={marrSort} order={marrOrder} onSort={onSortMarriage} />
                        <SortHeader label="Couple" sortKey="couple" active={marrSort} order={marrOrder} onSort={onSortMarriage} />
                        <th className="px-4 py-3.5 font-medium text-gray-600">Venue</th>
                        <SortHeader label="Payment" sortKey="payment" active={marrSort} order={marrOrder} onSort={onSortMarriage} />
                        <SortHeader label="Paid / Due" sortKey="amount" active={marrSort} order={marrOrder} onSort={onSortMarriage} align="right" />
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {marrApps.map((app) => (
                        <tr key={app.id} className="hover:bg-rose-50/20 transition-colors align-top">
                          <td className="px-5 py-4">
                            <p className="font-mono text-xs font-semibold text-rose-700">{app.applicationNumber}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(app.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-gray-900">{app.groomName}</p>
                            <p className="text-gray-500 text-xs">&amp; {app.brideName}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                              {app.venueType === 'mosque'
                                ? <><Building2 className="w-3.5 h-3.5" /> Mosque</>
                                : <><MapPin className="w-3.5 h-3.5" /> Outside</>}
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">{app.district ?? '—'}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PAY_BADGE[app.paymentStatus] ?? 'bg-gray-100 text-gray-600')}>
                              {PAY_LABEL[app.paymentStatus] ?? app.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <span className="font-semibold text-gray-900 tabular-nums">{Number(app.amountPaid).toLocaleString()}</span>
                            <span className="text-gray-400 tabular-nums"> / {Number(app.amountDue).toLocaleString()} RWF</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Link
                              href={`/${locale}/admin/marriage/${app.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors"
                            >
                              Review <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {marrPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Showing {(marrPage - 1) * 20 + 1}–{Math.min(marrPage * 20, marrTotal)} of {marrTotal} applications
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setMarrPage((p) => Math.max(p - 1, 1))} disabled={marrPage === 1} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rose-300 transition-colors">Previous</button>
                      <button onClick={() => setMarrPage((p) => Math.min(p + 1, marrPages))} disabled={marrPage === marrPages} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rose-300 transition-colors">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Payment History (combined ledger) ────────────────────────── */}
      {section === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by payer, reference or fund..."
                  value={histSearch}
                  onChange={(e) => { setHistSearch(e.target.value); setHistPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green/40"
                />
              </div>
              <SearchableSelect
                value={histSource}
                onChange={(v) => { setHistSource(v as typeof histSource); setHistPage(1); }}
                options={[
                  { value: '', label: 'All sources' },
                  { value: 'donation', label: 'Donations' },
                  ...(canViewMarriage ? [{ value: 'marriage', label: 'Marriage' }] : []),
                ]}
                className="w-full sm:w-52"
                triggerClassName="px-3 py-2.5 rounded-xl text-sm"
              />
            </div>
            <p className="mt-3 text-[11px] text-gray-400">
              Most recent payments across donations{canViewMarriage ? ' and marriage services' : ''}.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {histLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-rmc-green animate-spin" />
                <span className="ml-2 text-gray-500">Loading payments...</span>
              </div>
            ) : ledger.length === 0 ? (
              <div className="text-center py-16">
                <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No payments found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                      <th className="px-4 py-3.5 font-medium text-gray-600">Reference</th>
                      <SortHeader label="Source" sortKey="source" active={histSort} order={histOrder} onSort={onSortHistory} />
                      <SortHeader label="Payer" sortKey="payer" active={histSort} order={histOrder} onSort={onSortHistory} />
                      <SortHeader label="Status" sortKey="status" active={histSort} order={histOrder} onSort={onSortHistory} />
                      <SortHeader label="Amount" sortKey="amount" active={histSort} order={histOrder} onSort={onSortHistory} align="right" />
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden lg:table-cell">Method</th>
                      <SortHeader label="Date" sortKey="date" active={histSort} order={histOrder} onSort={onSortHistory} className="hidden md:table-cell" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ledgerPage.map((e) => (
                      <tr key={e.key} className="hover:bg-rmc-green/5 transition-colors align-top">
                        <td className="px-4 py-4">
                          <span className="font-mono text-xs font-semibold text-gray-700 break-all">{e.ref}</span>
                          <span className="block text-[11px] text-gray-400 truncate max-w-[180px]">{e.detail}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            e.source === 'marriage' ? 'bg-rose-50 text-rose-600' : 'bg-rmc-green/10 text-rmc-green',
                          )}>
                            {e.source === 'marriage' ? <Heart className="w-3 h-3" /> : <HandCoins className="w-3 h-3" />}
                            {e.source === 'marriage' ? 'Marriage' : 'Donation'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500">{initials(e.payer)}</span>
                            <p className="font-medium text-gray-900 break-words">{e.payer}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', PAY_BADGE[e.status] ?? 'bg-gray-100 text-gray-600')}>
                            {PAY_LABEL[e.status] ?? e.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(e.currency, e.amount)}
                          <span className="md:hidden block mt-0.5 text-[11px] font-normal text-gray-400">
                            {new Date(e.date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 hidden lg:table-cell capitalize">{e.method}</td>
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap hidden md:table-cell">
                          {new Date(e.date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ledger.length > 0 && histPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {(histClampedPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(histClampedPage * HISTORY_PAGE_SIZE, ledger.length)} of {ledger.length} payments
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setHistPage((p) => Math.max(p - 1, 1))} disabled={histClampedPage === 1} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rmc-green/40 transition-colors">Previous</button>
                  <button onClick={() => setHistPage((p) => Math.min(p + 1, histPages))} disabled={histClampedPage === histPages} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rmc-green/40 transition-colors">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {campaignModal.open && (
        <CampaignModal campaign={campaignModal.campaign} categories={categories} locale={locale} onClose={() => setCampaignModal({ open: false, campaign: null })} onSaved={() => { setCampaignModal({ open: false, campaign: null }); refreshAll(); }} />
      )}
      {editDonation && (
        <EditDonationModal
          donation={editDonation}
          campaigns={campaigns}
          onClose={() => setEditDonation(null)}
          onSaved={() => { setEditDonation(null); refreshAll(); }}
        />
      )}
      <ConfirmModal
        open={!!deleteCampaignTarget}
        onClose={() => setDeleteCampaignTarget(null)}
        onConfirm={confirmDeleteCampaign}
        title={t('programs.deleteConfirmTitle')}
        message={deleteCampaignTarget ? t('programs.deleteConfirmMessage', { title: deleteCampaignTarget.title }) : ''}
        confirmLabel={t('programs.delete')}
        variant="danger"
        isLoading={deletingCampaign}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** A clickable, sortable table header cell. */
function SortHeader({ label, sortKey, active, order, onSort, align, className }: {
  label: string;
  sortKey: string;
  active: string;
  order: SortOrder;
  onSort: (key: string) => void;
  align?: 'right';
  className?: string;
}) {
  const isActive = active === sortKey;
  return (
    <th className={cn('px-4 py-3.5 font-medium text-gray-600', align === 'right' && 'text-right', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-gray-900',
          align === 'right' && 'flex-row-reverse',
          isActive && 'text-gray-900',
        )}
      >
        {label}
        {isActive
          ? (order === 'ASC' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />)
          : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
      </button>
    </th>
  );
}

/** Dependency-free daily money-received area chart with hover tooltips. */
function DailyReceivedChart({ data, currency, locale }: { data: DailyPoint[]; currency: string; locale: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 200;
  const padX = 10;
  const padTop = 14;
  const padBottom = 26;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.received));
  const total = data.reduce((a, d) => a + d.received, 0);
  const peak = data.reduce<DailyPoint | null>((m, d) => (!m || d.received > m.received ? d : m), null);

  const x = (i: number) => padX + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padTop + innerH - (v / max) * innerH;
  const step = n > 1 ? innerW / (n - 1) : innerW;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.received).toFixed(1)}`).join(' ');
  const areaPath = n > 0
    ? `${linePath} L${x(n - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`
    : '';

  const fmtDay = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const tickEvery = Math.max(1, Math.ceil(n / 6));
  const hovered = hover != null ? data[hover] : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4 text-rmc-green" /> Daily money received</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Completed donations · last {n} days</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{formatCurrency(currency, total)}</p>
          <p className="text-[11px] text-gray-400">{peak && peak.received > 0 ? `Peak ${formatCurrency(currency, peak.received)} · ${fmtDay(peak.date)}` : 'No receipts yet'}</p>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1F8A4C" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1F8A4C" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* baseline */}
          <line x1={padX} y1={padTop + innerH} x2={W - padX} y2={padTop + innerH} stroke="#F1F1F1" strokeWidth={1} />

          {areaPath && <path d={areaPath} fill="url(#dailyFill)" />}
          {linePath && <path d={linePath} fill="none" stroke="#1F8A4C" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}

          {/* hover guide + marker */}
          {hovered && (
            <>
              <line x1={x(hover!)} y1={padTop} x2={x(hover!)} y2={padTop + innerH} stroke="#1F8A4C" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              <circle cx={x(hover!)} cy={y(hovered.received)} r={4} fill="#1F8A4C" stroke="#fff" strokeWidth={2} />
            </>
          )}

          {/* x-axis ticks */}
          {data.map((d, i) => (i % tickEvery === 0 || i === n - 1) && (
            <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>{fmtDay(d.date)}</text>
          ))}

          {/* hover capture */}
          {data.map((d, i) => (
            <rect key={d.date} x={x(i) - step / 2} y={padTop} width={step} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg whitespace-nowrap"
            style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(y(hovered.received) / H) * 100}%` }}
          >
            <span className="font-semibold tabular-nums">{formatCurrency(currency, hovered.received)}</span>
            <span className="text-gray-300"> · {hovered.count} {hovered.count === 1 ? 'gift' : 'gifts'}</span>
            <span className="block text-gray-400">{fmtDay(hovered.date)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SubNavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
        active ? 'border-rmc-green text-rmc-green' : 'border-transparent text-gray-500 hover:text-gray-800',
      )}
    >
      {icon} {label}
    </button>
  );
}

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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm ring-1 ring-black/5 p-5 transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 ring-1 ring-inset ring-black/5', color)}>{icon}</div>
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

function ProgramsTab({ campaigns, canManage, onNew, onEdit, onDelete, onRestored }: {
  campaigns: CampaignWithStats[];
  canManage: boolean;
  onNew: () => void;
  onEdit: (c: CampaignWithStats) => void;
  onDelete: (c: CampaignWithStats) => void;
  onRestored: () => void;
}) {
  const t = useTranslations('admin.donations');

  // "Recently deleted" disclosure — soft-deleted programs, lazily loaded on expand.
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleted, setDeleted] = useState<CampaignWithStats[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadDeleted = async () => {
    setLoadingDeleted(true);
    try {
      setDeleted(await donationsApi.admin.listDeletedCampaigns());
    } catch (err) {
      console.error('Failed to load deleted programs', err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const toggleDeleted = () => {
    const next = !showDeleted;
    setShowDeleted(next);
    if (next) loadDeleted();
  };

  const restore = async (id: string) => {
    setRestoringId(id);
    try {
      await donationsApi.admin.restoreCampaign(id);
      await loadDeleted();
      onRestored();
    } catch (err) {
      console.error('Failed to restore program', err);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={onNew} className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rmc-green text-white text-sm font-bold shadow-md shadow-rmc-green/25 hover:bg-rmc-green-dark transition-all duration-300">
            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" /> {t('programs.new')}
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
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm ring-1 ring-black/5 p-5 transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-tight truncate">{c.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.fundType} · {c.donationCount} {c.donationCount === 1 ? t('programs.donation') : t('programs.donations')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CampaignStatusBadge status={c.status} />
                    {canManage && (
                      <>
                        <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-rmc-green hover:bg-rmc-green/5 transition-colors" aria-label={t('campaignModal.editTitle')}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label={t('programs.delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <NotifySubscribersButton
                          compact
                          subject={`New program: ${c.title}`}
                          html={`<p>${c.description || ''}</p><p>Support <strong>${c.title}</strong> on the RMC donate page.</p>`}
                        />
                      </>
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
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={cn('h-full rounded-full transition-all duration-700', funded ? 'bg-gradient-to-r from-rmc-gold to-rmc-gold-light' : 'bg-gradient-to-r from-rmc-green to-rmc-green-dark')} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {t('programs.raisedNote', { amount: formatCurrency(c.currency, raised) })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <div className="pt-2">
          <button
            onClick={toggleDeleted}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-rmc-green"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', showDeleted && 'rotate-180 text-rmc-green')} />
            {t('programs.deletedSectionTitle')}
            {deleted.length > 0 && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{deleted.length}</span>}
          </button>

          {showDeleted && (
            <div className="mt-3 space-y-2">
              {loadingDeleted ? (
                <p className="text-xs text-gray-400">…</p>
              ) : deleted.length === 0 ? (
                <p className="text-xs text-gray-400">{t('programs.deletedEmpty')}</p>
              ) : (
                deleted.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-700">{c.title}</span>
                      <span className="block text-[11px] capitalize text-gray-400">{c.fundType} · {c.currency} {formatMoney(Number(c.targetAmount))}</span>
                    </span>
                    <button
                      onClick={() => restore(c.id)}
                      disabled={restoringId === c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rmc-green/30 px-3 py-1.5 text-xs font-semibold text-rmc-green transition-colors hover:bg-rmc-green/5 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {restoringId === c.id ? t('programs.restoring') : t('programs.restore')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
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

function CampaignModal({ campaign, categories, locale, onClose, onSaved }: {
  campaign: CampaignWithStats | null;
  categories: AdminCategory[];
  locale: string;
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
  const [subFundId, setSubFundId] = useState<string | null>(campaign?.subFundId ?? null);
  const [startDate, setStartDate] = useState(campaign?.startDate ?? '');
  const [endDate, setEndDate] = useState(campaign?.endDate ?? '');
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErr, setFieldErr] = useState<{ title?: string; targetAmount?: string; heroImage?: string; subFund?: string }>({});

  const statusLabels: Record<CampaignStatus, string> = {
    active: t('programs.statusActive'),
    paused: t('programs.statusPaused'),
    closed: t('programs.statusClosed'),
  };

  // Category options — admin-managed categories (dynamic from the API), plus the
  // special "general" fund and any legacy value an existing campaign already holds.
  const catOptions: { key: string; label: string }[] = [
    { key: 'general', label: td('general.categoryTitle') },
    ...categories
      .filter((c) => c.status === 'active')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ key: c.key, label: categoryTitle(c, locale) })),
  ];
  if (fundType && !catOptions.some((o) => o.key === fundType)) {
    catOptions.unshift({ key: fundType, label: fundType });
  }

  // Sub-fund options for the selected category. A program is created under a
  // sub-fund when the chosen category has any (required); otherwise category-level.
  const selectedCat = categories.find((c) => c.key === fundType && c.status === 'active');
  const subFundOptions = (selectedCat?.subfunds ?? [])
    .filter((s) => s.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      id: s.id,
      label: (locale === 'rw' ? s.labelRw : locale === 'ar' ? s.labelAr : s.labelEn) || s.labelEn || s.key,
    }));
  const hasSubFunds = subFundOptions.length > 0;

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
    if (s === 1 && hasSubFunds && !subFundId) fe.subFund = t('campaignModal.required');
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
    if (fe.targetAmount || fe.subFund) { setStep(1); return; }

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
      // Tie to the chosen sub-fund when the category has any; else category-level.
      subFundId: hasSubFunds ? subFundId : null,
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
            <SearchableSelect
              value={currency}
              onChange={setCurrency}
              options={['RWF', 'USD', 'EUR', 'GBP'].map((c) => ({ value: c, label: c }))}
              triggerClassName={inputClass}
            />
          </Field>
          <Field label={t('campaignModal.category')} hint={t('campaignModal.categoryHint')}>
            <SearchableSelect
              value={fundType}
              onChange={(v) => { setFundType(v); setSubFundId(null); }}
              options={catOptions.map((o) => ({ value: o.key, label: o.label }))}
              triggerClassName={inputClass}
            />
          </Field>
          {hasSubFunds && (
            <Field label={t('campaignModal.subFund')} hint={t('campaignModal.subFundHint')} required error={fieldErr.subFund}>
              <SearchableSelect
                value={subFundId ?? ''}
                onChange={(v) => setSubFundId(v || null)}
                options={subFundOptions.map((o) => ({ value: o.id, label: o.label }))}
                noneLabel={t('campaignModal.subFundPlaceholder')}
                triggerClassName={inputClass}
              />
            </Field>
          )}
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
            <SearchableSelect
              value={status}
              onChange={(v) => setStatus(v as CampaignStatus)}
              options={(['active', 'paused', 'closed'] as CampaignStatus[]).map((s) => ({ value: s, label: statusLabels[s] }))}
              triggerClassName={inputClass}
            />
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
          <SearchableSelect
            value={status}
            onChange={(v) => setStatus(v as DonationStatus)}
            options={EDIT_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            triggerClassName={inputClass}
          />
        </Field>
        <Field label={t('editModal.program')}>
          <SearchableSelect
            value={campaignId}
            onChange={setCampaignId}
            options={[
              { value: '', label: t('generalFund') },
              ...campaigns.map((c) => ({ value: c.id, label: c.title })),
            ]}
            triggerClassName={inputClass}
          />
        </Field>
        <Field label={t('editModal.amount')}>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('editModal.currency')}>
          <SearchableSelect
            value={currency}
            onChange={setCurrency}
            options={EDIT_CURRENCIES.map((c) => ({ value: c, label: c }))}
            triggerClassName={inputClass}
          />
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
