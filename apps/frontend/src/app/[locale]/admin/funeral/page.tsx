'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Moon, RefreshCw, Download, Search, ArrowUpRight, ChevronRight,
  ClipboardList, Landmark, BarChart3, LayoutDashboard, Truck,
  Phone, Clock, CheckCircle2, Plus, Pencil, Trash2, SlidersHorizontal, Loader2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { FuneralStatCard } from '@/components/funeral/FuneralStatCard';
import { EmptyState } from '@/components/funeral/EmptyState';
import { ConfirmDialog } from '@/components/funeral/ConfirmDialog';
import { FuneralToast } from '@/components/funeral/FuneralToast';
import { RequestStageDialog } from '@/components/funeral/RequestStageDialog';
import { CemeteryFormDialog } from '@/components/funeral/CemeteryFormDialog';
import { TransportFormDialog } from '@/components/funeral/TransportFormDialog';
import { funeralApi, type TransportPayload } from '@/lib/funeralApi';
import { occupancyPercent, requestProgress } from '@/components/funeral/data';
import { pickStep } from '@/components/funeral/stepLabels';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  type FuneralRequest, type Cemetery, type Transport, type FuneralStepConfig,
} from '@/components/funeral/types';

export default function AdminFuneralPage() {
  return (
    <ProtectedRoute permissions={[Permission.FUNERAL_VIEW]}>
      <FuneralAdmin />
    </ProtectedRoute>
  );
}

type Tab = 'overview' | 'requests' | 'cemeteries' | 'transports' | 'reports';

const TABS: { key: Tab; icon: React.ElementType }[] = [
  { key: 'overview', icon: LayoutDashboard },
  { key: 'requests', icon: ClipboardList },
  { key: 'cemeteries', icon: Landmark },
  { key: 'transports', icon: Truck },
  { key: 'reports', icon: BarChart3 },
];


function FuneralAdmin() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('admin.funeral');
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.FUNERAL_MANAGE);

  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [steps, setSteps] = useState<FuneralStepConfig[]>([]);

  const [requests, setRequests] = useState<FuneralRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [loadingCemeteries, setLoadingCemeteries] = useState(true);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loadingTransports, setLoadingTransports] = useState(true);

  // Dialog + feedback state.
  const [managingRequest, setManagingRequest] = useState<FuneralRequest | null>(null);
  const [cemeteryForm, setCemeteryForm] = useState<{ open: boolean; initial?: Cemetery }>({ open: false });
  const [transportForm, setTransportForm] = useState<{ open: boolean; initial?: Transport }>({ open: false });
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    let active = true;
    funeralApi.listRequests()
      .then((res) => { if (active) setRequests(res); })
      .catch(() => { if (active) setRequests([]); })
      .finally(() => { if (active) setLoadingRequests(false); });
    funeralApi.listCemeteries()
      .then((res) => { if (active) setCemeteries(res); })
      .catch(() => { if (active) setCemeteries([]); })
      .finally(() => { if (active) setLoadingCemeteries(false); });
    funeralApi.adminListTransports()
      .then((res) => { if (active) setTransports(res); })
      .catch(() => { if (active) setTransports([]); })
      .finally(() => { if (active) setLoadingTransports(false); });
    funeralApi.listSteps()
      .then((res) => { if (active) setSteps(res); })
      .catch(() => { if (active) setSteps([]); });
    return () => { active = false; };
  }, []);

  const stepByKey = useMemo(() => new Map(steps.map((s) => [s.key, s])), [steps]);
  const terminalKey = steps.length ? steps[steps.length - 1].key : undefined;
  const stageLabel = (s: string) => { const st = stepByKey.get(s); return st ? pickStep(st.title, locale) : s; };
  const stagePillStyle = (s: string) => { const c = stepByKey.get(s)?.color ?? '#6b7280'; return { backgroundColor: `${c}1a`, color: c }; };
  const fmtDate = (v: string) => new Date(v).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  // Derived figures — "completed" = the terminal (last active) step.
  const completed = terminalKey ? requests.filter((r) => r.stage === terminalKey).length : 0;
  const pending = requests.length - completed;

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (q && !r.deceased.fullName.toLowerCase().includes(q)) return false;
      if (stageFilter && r.stage !== stageFilter) return false;
      return true;
    });
  }, [requests, query, stageFilter]);

  // ── Mutations ──
  const saveRequestStage = async (stage: string) => {
    if (!managingRequest) return;
    const target = managingRequest;
    setManagingRequest(null);
    try {
      const updated = await funeralApi.updateRequestStage(target.id, stage);
      setRequests((prev) => prev.map((r) => (r.id === target.id ? updated : r)));
      setToast(t('requests.toastUpdated', { name: target.deceased.fullName, stage: stageLabel(stage) }));
    } catch {
      setToast(t('requests.toastError'));
    }
  };

  const saveCemetery = async (c: Cemetery) => {
    const target = cemeteryForm.initial;
    const editing = target != null;
    // Strip the client id — the server owns it.
    const { id: _id, ...payload } = c;
    void _id;
    setCemeteryForm({ open: false });
    try {
      if (editing) {
        const updated = await funeralApi.updateCemetery(target.id, payload);
        setCemeteries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await funeralApi.createCemetery(payload);
        setCemeteries((prev) => [...prev, created]);
      }
      setToast(t(editing ? 'cemeteries.toastUpdated' : 'cemeteries.toastCreated', { name: c.name }));
    } catch {
      setToast(t('cemeteries.toastError'));
    }
  };

  const deleteCemetery = (c: Cemetery) => {
    setConfirm({
      message: t('cemeteries.deleteConfirm', { name: c.name }),
      onConfirm: async () => {
        setConfirm(null);
        try {
          await funeralApi.deleteCemetery(c.id);
          setCemeteries((prev) => prev.filter((x) => x.id !== c.id));
          setToast(t('cemeteries.toastDeleted', { name: c.name }));
        } catch {
          setToast(t('cemeteries.toastError'));
        }
      },
    });
  };

  const saveTransport = async (payload: TransportPayload) => {
    const target = transportForm.initial;
    const editing = target != null;
    setTransportForm({ open: false });
    try {
      if (editing) {
        const updated = await funeralApi.updateTransport(target.id, payload);
        setTransports((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await funeralApi.createTransport(payload);
        setTransports((prev) => [...prev, created]);
      }
      setToast(t(editing ? 'transports.toastUpdated' : 'transports.toastCreated', { name: payload.name }));
    } catch {
      setToast(t('transports.toastError'));
    }
  };

  const deleteTransport = (tr: Transport) => {
    setConfirm({
      message: t('transports.deleteConfirm', { name: tr.name }),
      onConfirm: async () => {
        setConfirm(null);
        try {
          await funeralApi.deleteTransport(tr.id);
          setTransports((prev) => prev.filter((x) => x.id !== tr.id));
          setToast(t('transports.toastDeleted', { name: tr.name }));
        } catch {
          setToast(t('transports.toastError'));
        }
      },
    });
  };

  /**
   * Full .xlsx report of every request matching the current filters — built by the
   * backend, which can reach the fields (family, arrangements) the table never loads
   * into view.
   */
  const exportRequests = async () => {
    setExporting(true);
    try {
      await funeralApi.exportRequestsXlsx({ stage: stageFilter, search: query });
    } catch {
      setToast(t('requests.toastExportError'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rmc-green to-rmc-green-deep shadow-sm shadow-rmc-green/30">
            <Moon className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(tab === 'requests' || tab === 'reports') && (
            <button
              onClick={() => void exportRequests()}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t('export')}
            </button>
          )}
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green">
            <RefreshCw className="h-4 w-4" /> {t('refresh')}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <FuneralStatCard icon={Clock} tone="amber" value={pending} label={t('stats.pending')} loading={loadingRequests} />
        <FuneralStatCard icon={CheckCircle2} tone="green" value={completed} label={t('stats.completed')} loading={loadingRequests} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-100">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
              tab === tb.key ? 'border-rmc-green text-rmc-green' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            <tb.icon className="h-4 w-4" /> {t(`tabs.${tb.key}`)}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900"><ClipboardList className="h-4 w-4 text-rmc-green" /> {t('overview.recentRequests')}</h2>
              <button onClick={() => setTab('requests')} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-rmc-green">
                {t('overview.viewAll')} <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {loadingRequests ? (
              <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" aria-label={t('loading')} /></div>
            ) : requests.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-gray-400">{t('requests.emptyTitle')}</p>
            ) : (
            <ul className="divide-y divide-gray-50">
              {requests.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href={`/${locale}/admin/funeral/requests/${r.id}`} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-gray-50 -mx-2 rounded-lg px-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rmc-green/10 text-[11px] font-bold text-rmc-green">
                      {r.deceased.fullName.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-gray-900">{r.deceased.fullName}</p>
                      <p className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={stagePillStyle(r.stage)}>{stageLabel(r.stage)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Requests ── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('requests.searchPlaceholder')}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 rtl:pl-3 rtl:pr-9"
              />
            </div>
            <SearchableSelect
              value={stageFilter}
              onChange={setStageFilter}
              options={[
                { value: '', label: t('requests.allStages') },
                ...steps.map((s) => ({ value: s.key, label: stageLabel(s.key) })),
              ]}
              className="w-full sm:w-56"
              triggerClassName="rounded-xl px-3 py-2.5 text-sm"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5">
            {loadingRequests ? (
              <div className="flex items-center justify-center p-12 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" aria-label={t('loading')} /></div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-6"><EmptyState icon={ClipboardList} title={t('requests.emptyTitle')} message={t('requests.emptyText')} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left rtl:text-right">
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('requests.col.deceased')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('requests.col.stage')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden md:table-cell">{t('requests.col.progress')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden lg:table-cell">{t('requests.col.contact')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden sm:table-cell">{t('requests.col.date')}</th>
                      <th className="px-4 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRequests.map((r) => (
                      <tr key={r.id} className="align-top transition-colors hover:bg-rmc-green/[0.03]">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">{r.deceased.fullName}</p>
                          <p className="text-[11px] text-gray-400 sm:hidden">{fmtDate(r.createdAt)}</p>
                        </td>
                        <td className="px-4 py-4"><span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold" style={stagePillStyle(r.stage)}>{stageLabel(r.stage)}</span></td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-gradient-to-r from-rmc-green to-rmc-green-dark" style={{ width: `${requestProgress(r)}%` }} />
                            </div>
                            <span className="text-[11px] font-semibold tabular-nums text-gray-500">{requestProgress(r)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden text-gray-500 lg:table-cell">
                          <a href={`tel:${r.family.phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-rmc-green">
                            <Phone className="h-3.5 w-3.5" /> {r.family.phone}
                          </a>
                        </td>
                        <td className="px-4 py-4 hidden whitespace-nowrap text-xs text-gray-500 sm:table-cell">{fmtDate(r.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-3">
                            {canManage && (
                              <button
                                onClick={() => setManagingRequest(r)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-rmc-green"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" /> {t('requests.manage')}
                              </button>
                            )}
                            <Link href={`/${locale}/admin/funeral/requests/${r.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark">
                              {t('requests.view')} <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cemeteries ── */}
      {tab === 'cemeteries' && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <button
                onClick={() => setCemeteryForm({ open: true })}
                className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-4 py-2 text-sm font-bold text-white shadow-sm shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
              >
                <Plus className="h-4 w-4" /> {t('cemeteries.add')}
              </button>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5">
            {loadingCemeteries ? (
              <div className="flex items-center justify-center p-12 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" aria-label={t('loading')} /></div>
            ) : cemeteries.length === 0 ? (
              <div className="p-6"><EmptyState icon={Landmark} title={t('cemeteries.emptyTitle')} message={t('cemeteries.emptyText')} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left rtl:text-right">
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('cemeteries.col.name')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden sm:table-cell">{t('cemeteries.col.location')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('cemeteries.col.occupancy')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden md:table-cell">{t('cemeteries.col.contact')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden lg:table-cell">{t('cemeteries.col.phone')}</th>
                      {canManage && <th className="px-4 py-3.5" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cemeteries.map((c) => {
                      const pct = occupancyPercent(c.used, c.capacity);
                      return (
                        <tr key={c.id} className="transition-colors hover:bg-rmc-green/[0.03]">
                          <td className="px-4 py-4 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-4 hidden text-gray-500 sm:table-cell">{c.address}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                                <div className={cn('h-full rounded-full', pct >= 85 ? 'bg-amber-500' : 'bg-rmc-green')} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] font-semibold tabular-nums text-gray-500">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 hidden text-gray-500 md:table-cell">{c.contactPerson}</td>
                          <td className="px-4 py-4 hidden text-gray-500 lg:table-cell">
                            <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="hover:text-rmc-green">{c.phone}</a>
                          </td>
                          {canManage && (
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => setCemeteryForm({ open: true, initial: c })} aria-label={t('actions.edit')} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-rmc-green">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => deleteCemetery(c)} aria-label={t('actions.delete')} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Transports ── */}
      {tab === 'transports' && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <button
                onClick={() => setTransportForm({ open: true })}
                className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-4 py-2 text-sm font-bold text-white shadow-sm shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
              >
                <Plus className="h-4 w-4" /> {t('transports.add')}
              </button>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5">
            {loadingTransports ? (
              <div className="flex items-center justify-center p-12 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" aria-label={t('loading')} /></div>
            ) : transports.length === 0 ? (
              <div className="p-6"><EmptyState icon={Truck} title={t('transports.emptyTitle')} message={t('transports.emptyText')} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left rtl:text-right">
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('transports.col.name')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('transports.col.mosque')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden sm:table-cell">{t('transports.col.location')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden lg:table-cell">{t('transports.col.phone')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('transports.col.status')}</th>
                      {canManage && <th className="px-4 py-3.5" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transports.map((tr) => (
                      <tr key={tr.id} className="transition-colors hover:bg-rmc-green/[0.03]">
                        <td className="px-4 py-4 font-medium text-gray-900">{tr.name}</td>
                        <td className="px-4 py-4 text-gray-500">{tr.mosque}</td>
                        <td className="px-4 py-4 hidden text-gray-500 sm:table-cell">{tr.location}</td>
                        <td className="px-4 py-4 hidden text-gray-500 lg:table-cell">
                          <a href={`tel:${tr.phone.replace(/\s+/g, '')}`} className="hover:text-rmc-green">{tr.phone}</a>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
                            tr.isActive ? 'bg-rmc-green/10 text-rmc-green' : 'bg-gray-100 text-gray-500',
                          )}>
                            {t(tr.isActive ? 'transports.status.active' : 'transports.status.inactive')}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setTransportForm({ open: true, initial: tr })} aria-label={t('actions.edit')} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-rmc-green">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => deleteTransport(tr)} aria-label={t('actions.delete')} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reports ── */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <ReportTile label={t('reports.totalRequests')} value={requests.length} icon={ClipboardList} />
            <ReportTile label={t('reports.completed')} value={completed} icon={CheckCircle2} />
          </div>

          {/* By stage */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900"><BarChart3 className="h-4 w-4 text-rmc-green" /> {t('reports.byStage')}</h2>
            <div className="space-y-2.5">
              {steps.map((s) => {
                const count = requests.filter((r) => r.stage === s.key).length;
                const pct = requests.length ? Math.round((count / requests.length) * 100) : 0;
                return (
                  <div key={s.key}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
                      <span className="truncate text-gray-600">{stageLabel(s.key)}</span>
                      <span className="shrink-0 font-bold tabular-nums text-gray-800">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color ?? '#0d3d24' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!canManage && <p className="text-[12px] text-gray-400">{t('viewerNote')}</p>}
        </div>
      )}

      {/* ── Dialogs ── */}
      {managingRequest && (
        <RequestStageDialog
          request={managingRequest}
          steps={steps}
          stageLabel={stageLabel}
          onSave={saveRequestStage}
          onClose={() => setManagingRequest(null)}
        />
      )}
      {cemeteryForm.open && (
        <CemeteryFormDialog
          initial={cemeteryForm.initial}
          onSave={saveCemetery}
          onClose={() => setCemeteryForm({ open: false })}
        />
      )}
      {transportForm.open && (
        <TransportFormDialog
          initial={transportForm.initial}
          onSave={saveTransport}
          onClose={() => setTransportForm({ open: false })}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={t('actions.confirmTitle')}
          message={confirm.message}
          confirmLabel={t('actions.delete')}
          cancelLabel={t('actions.cancel')}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Success toast */}
      <FuneralToast message={toast} />
    </div>
  );
}

function ReportTile({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green ring-1 ring-inset ring-black/5">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-2xl font-bold leading-none tabular-nums text-gray-900">{value}</p>
      <p className="mt-1.5 text-[13px] text-gray-500">{label}</p>
    </div>
  );
}
