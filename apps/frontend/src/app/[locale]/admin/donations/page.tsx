'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  HandCoins, Search, RefreshCw, TrendingUp, Wallet, Clock, Receipt,
  Plus, Pencil, X, Download, Trophy, Layers, CheckCircle2, CalendarRange,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import {
  donationsApi, Donation, DonationStats, CampaignWithStats, DonationStatus,
  CampaignStatus, STATUS_LABELS, formatCurrency,
} from '@/lib/donationsApi';
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

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

// Quick time-range presets — selecting one filters the list AND the metrics above.
const PRESETS: { key: string; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
];

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

/** Donor display — anonymous (or nameless) donors show as "Unknown". */
function donorLabel(d: Donation): string {
  if (d.isAnonymous) return 'Unknown';
  return d.donorName?.trim() || 'Unknown';
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

  const [tab, setTab] = useState<Tab>('report');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<DonationStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);

  const [editing, setEditing] = useState<Donation | null>(null);
  const [campaignModal, setCampaignModal] = useState<{ open: boolean; campaign: CampaignWithStats | null }>({ open: false, campaign: null });

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
    () => PRESETS.find((p) => {
      const r = presetRange(p.key);
      return r.dateFrom === filters.dateFrom && r.dateTo === filters.dateTo;
    })?.key,
    [filters.dateFrom, filters.dateTo],
  );
  const hasActiveFilters = useMemo(
    () => Object.values(filters).some(Boolean),
    [filters],
  );

  // Headline figures (RWF is the primary currency; other currencies shown as a strip)
  const rwf = stats?.byCurrency.find((c) => c.currency === 'RWF');
  const otherCurrencies = stats?.byCurrency.filter((c) => c.currency !== 'RWF') ?? [];
  const topProgram = stats?.byProgram[0];

  const exportCsv = () => {
    const header = ['Transaction ID', 'Date', 'Donor', 'Email', 'Program', 'Amount', 'Currency', 'Method'];
    const rows = donations.map((d) => [
      txnRef(d.id),
      new Date(d.donatedAt).toISOString().slice(0, 10),
      donorLabel(d),
      d.isAnonymous ? '' : d.donorEmail ?? '',
      d.campaign?.title ?? 'General fund',
      String(d.amount),
      d.currency,
      d.paymentMethod ?? '',
    ]);
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
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Donations</h1>
            <p className="text-sm text-gray-500">Track donations received across all programs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'report' && (
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          )}
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-rmc-green/40 hover:text-rmc-green transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          color="text-rmc-green bg-rmc-green/10"
          label="Total received (RWF)"
          value={formatCurrency('RWF', rwf?.received ?? 0)}
        />
        <StatCard
          icon={<Receipt className="w-5 h-5" />}
          color="text-blue-600 bg-blue-50"
          label="Total donations"
          value={String(stats?.count ?? 0)}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          color="text-amber-600 bg-amber-50"
          label="Top program"
          value={topProgram ? formatCurrency(topProgram.currency, topProgram.received) : '—'}
          sub={topProgram?.title}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          color="text-yellow-600 bg-yellow-50"
          label="Pending (RWF)"
          value={formatCurrency('RWF', rwf?.pending ?? 0)}
        />
      </div>

      {/* Other-currency strip */}
      {otherCurrencies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {otherCurrencies.map((c) => (
            <span key={c.currency} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-100 px-3 py-1 text-xs text-gray-600">
              <TrendingUp className="w-3.5 h-3.5 text-rmc-green" />
              <span className="font-semibold text-gray-900">{formatCurrency(c.currency, c.received)}</span> received · {c.count} {c.count === 1 ? 'gift' : 'gifts'}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        <TabButton active={tab === 'report'} onClick={() => setTab('report')} icon={<Receipt className="w-4 h-4" />} label="Donations" count={total} />
        <TabButton active={tab === 'programs'} onClick={() => setTab('programs')} icon={<Layers className="w-4 h-4" />} label="Programs" count={campaigns.length} />
      </div>

      {tab === 'report' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {/* Quick time-range presets — metrics above update to match the selection */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mr-1">
                <CalendarRange className="w-3.5 h-3.5" /> Period
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                    activePreset === p.key
                      ? 'bg-rmc-green text-white border-rmc-green'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-rmc-green/40 hover:text-rmc-green',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search donor name or email..."
                  value={filters.search}
                  onChange={(e) => patch({ search: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green/40"
                />
              </div>
              <select
                value={filters.campaignId}
                onChange={(e) => patch({ campaignId: e.target.value })}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 bg-white"
              >
                <option value="">All programs</option>
                <option value="general">General fund</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select
                value={filters.status}
                onChange={(e) => patch({ status: e.target.value })}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 bg-white"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => patch({ dateFrom: e.target.value })}
                  className="w-full min-w-0 px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 text-gray-600"
                  aria-label="From date"
                />
                <span className="text-gray-300 text-xs">→</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => patch({ dateTo: e.target.value })}
                  className="w-full min-w-0 px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 text-gray-600"
                  aria-label="To date"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-rmc-green transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-rmc-green animate-spin" />
                <span className="ml-2 text-gray-500">Loading donations...</span>
              </div>
            ) : donations.length === 0 ? (
              <div className="text-center py-16">
                <HandCoins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No donations found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-3.5 font-medium text-gray-600">Transaction</th>
                      <th className="text-left px-4 py-3.5 font-medium text-gray-600">Donor</th>
                      <th className="text-left px-4 py-3.5 font-medium text-gray-600 hidden sm:table-cell">Program</th>
                      <th className="text-right px-4 py-3.5 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3.5 font-medium text-gray-600 hidden lg:table-cell">Method</th>
                      <th className="text-left px-4 py-3.5 font-medium text-gray-600 hidden md:table-cell">Date</th>
                      {canManage && <th className="px-4 py-3.5 w-px" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {donations.map((d) => (
                      <tr key={d.id} className="hover:bg-rmc-green/5 transition-colors align-top">
                        <td className="px-4 py-4">
                          <span className="font-mono text-xs font-semibold text-gray-700 break-all" title={d.id}>{txnRef(d.id)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900 break-words">{donorLabel(d)}</p>
                          {!d.isAnonymous && d.donorEmail && <p className="text-xs text-gray-400 break-all">{d.donorEmail}</p>}
                          {/* Folded-in details for narrow screens (no horizontal scroll) */}
                          <p className="sm:hidden mt-1 text-xs text-gray-500">{d.campaign?.title ?? 'General fund'}</p>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <span className="text-gray-700">{d.campaign?.title ?? 'General fund'}</span>
                          {d.frequency !== 'once' && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-rmc-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-rmc-green capitalize">{d.frequency}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(d.currency, d.amount)}
                          <span className="md:hidden block mt-0.5 text-[11px] font-normal text-gray-400">
                            {new Date(d.donatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 capitalize hidden lg:table-cell">{d.paymentMethod ?? '—'}</td>
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap hidden md:table-cell">
                          {new Date(d.donatedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        {canManage && (
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => setEditing(d)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rmc-green hover:text-rmc-green-dark transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} donations
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rmc-green/40 transition-colors">Previous</button>
                      <button onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page === pages}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rmc-green/40 transition-colors">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <ProgramsTab
          campaigns={campaigns}
          canManage={canManage}
          onNew={() => setCampaignModal({ open: true, campaign: null })}
          onEdit={(c) => setCampaignModal({ open: true, campaign: c })}
        />
      )}

      {/* Modals */}
      {editing && (
        <EditDonationModal
          donation={editing}
          campaigns={campaigns}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refreshAll(); }}
        />
      )}
      {campaignModal.open && (
        <CampaignModal
          campaign={campaignModal.campaign}
          onClose={() => setCampaignModal({ open: false, campaign: null })}
          onSaved={() => { setCampaignModal({ open: false, campaign: null }); refreshAll(); }}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark transition-colors">
            <Plus className="w-4 h-4" /> New program
          </button>
        </div>
      )}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No programs yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            // Raised is the sum of completed donation transactions for this
            // program (in the program's currency) — same raised / goal progress
            // shown on the public donate page.
            const raised = Number(c.receivedAmount);
            const pct = fundedPercent(raised, c.targetAmount);
            const funded = pct >= 100;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-tight truncate">{c.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.fundType} · {c.donationCount} {c.donationCount === 1 ? 'donation' : 'donations'}</p>
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
                  {formatCurrency(c.currency, raised)} raised from completed donations
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
  const map: Record<CampaignStatus, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-600',
  };
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize', map[status])}>{status}</span>;
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green/40';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5';

function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">{footer}</div>
      </div>
    </div>
  );
}

function EditDonationModal({ donation, campaigns, onClose, onSaved }: {
  donation: Donation;
  campaigns: CampaignWithStats[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(donation.amount));
  const [status, setStatus] = useState<DonationStatus>(donation.status);
  const [currency, setCurrency] = useState(donation.currency);
  const [campaignId, setCampaignId] = useState(donation.campaignId ?? 'general');
  const [donorName, setDonorName] = useState(donation.donorName ?? '');
  const [donorEmail, setDonorEmail] = useState(donation.donorEmail ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await donationsApi.admin.updateDonation(donation.id, {
        amount: Number(amount),
        status,
        currency,
        campaignId: campaignId === 'general' ? null : campaignId,
        donorName: donorName || undefined,
        donorEmail: donorEmail || undefined,
      });
      onSaved();
    } catch {
      setError('Could not save changes. Please try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Edit donation"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </>
      }
    >
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            {['RWF', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as DonationStatus)} className={inputClass}>
            {(['pending', 'completed', 'failed', 'refunded'] as DonationStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Program</label>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
            <option value="general">General fund</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Donor name</label>
        <input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="Anonymous" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Donor email</label>
        <input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} className={inputClass} />
      </div>
    </ModalShell>
  );
}

function CampaignModal({ campaign, onClose, onSaved }: {
  campaign: CampaignWithStats | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!campaign;
  const [title, setTitle] = useState(campaign?.title ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [targetAmount, setTargetAmount] = useState(String(campaign?.targetAmount ?? ''));
  const [currency, setCurrency] = useState(campaign?.currency ?? 'RWF');
  const [fundType, setFundType] = useState(campaign?.fundType ?? 'general');
  const [startDate, setStartDate] = useState(campaign?.startDate ?? '');
  const [endDate, setEndDate] = useState(campaign?.endDate ?? '');
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim() || !targetAmount) { setError('Title and target amount are required.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      title: title.trim(),
      description: description.trim(),
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
      setError('Could not save the program. Please try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? 'Edit program' : 'New program'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-rmc-green text-white text-sm font-semibold hover:bg-rmc-green-dark disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create program'}
          </button>
        </>
      }
    >
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <div>
        <label className={labelClass}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Target amount</label>
          <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            {['RWF', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Fund type</label>
          <input value={fundType} onChange={(e) => setFundType(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)} className={inputClass}>
            {(['active', 'paused', 'closed'] as CampaignStatus[]).map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End date</label>
          <input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>
    </ModalShell>
  );
}
