'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Moon, RefreshCw, Download, Search, ArrowUpRight, ChevronRight,
  ClipboardList, Bell, Users, Landmark, BarChart3, LayoutDashboard,
  UserRound, Phone, Clock, CheckCircle2, Plus, Pencil, Trash2, SlidersHorizontal, Loader2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { FuneralStatCard } from '@/components/funeral/FuneralStatCard';
import { VolunteerManagement } from '@/components/funeral/VolunteerManagement';
import { EmptyState } from '@/components/funeral/EmptyState';
import { ConfirmDialog } from '@/components/funeral/ConfirmDialog';
import { FuneralToast } from '@/components/funeral/FuneralToast';
import { RequestStageDialog } from '@/components/funeral/RequestStageDialog';
import { AnnouncementFormDialog } from '@/components/funeral/AnnouncementFormDialog';
import { CemeteryFormDialog } from '@/components/funeral/CemeteryFormDialog';
import { funeralApi } from '@/lib/funeralApi';
import { occupancyPercent, requestProgress } from '@/components/funeral/data';
import { pickStep } from '@/components/funeral/stepLabels';
import {
  type FuneralRequest, type FuneralAnnouncement, type Cemetery,
  type Volunteer, type VolunteerTask, type FuneralStepConfig, type FuneralSkillConfig,
} from '@/components/funeral/types';

export default function AdminFuneralPage() {
  return (
    <ProtectedRoute permissions={[Permission.FUNERAL_VIEW]}>
      <FuneralAdmin />
    </ProtectedRoute>
  );
}

type Tab = 'overview' | 'requests' | 'announcements' | 'volunteers' | 'cemeteries' | 'reports';

const TABS: { key: Tab; icon: React.ElementType }[] = [
  { key: 'overview', icon: LayoutDashboard },
  { key: 'requests', icon: ClipboardList },
  { key: 'announcements', icon: Bell },
  { key: 'volunteers', icon: Users },
  { key: 'cemeteries', icon: Landmark },
  { key: 'reports', icon: BarChart3 },
];


function FuneralAdmin() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('admin.funeral');
  const ts = useTranslations('services.funeral');
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.FUNERAL_MANAGE);

  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [steps, setSteps] = useState<FuneralStepConfig[]>([]);
  const [skills, setSkills] = useState<FuneralSkillConfig[]>([]);

  // Funeral requests come from the backend; the rest are still mock/in-memory
  // until their modules land.
  const [requests, setRequests] = useState<FuneralRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [announcements, setAnnouncements] = useState<FuneralAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [loadingCemeteries, setLoadingCemeteries] = useState(true);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(true);

  // Dialog + feedback state.
  const [managingRequest, setManagingRequest] = useState<FuneralRequest | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<{ open: boolean; initial?: FuneralAnnouncement }>({ open: false });
  const [cemeteryForm, setCemeteryForm] = useState<{ open: boolean; initial?: Cemetery }>({ open: false });
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState('');

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
    funeralApi.listAnnouncements()
      .then((res) => { if (active) setAnnouncements(res); })
      .catch(() => { if (active) setAnnouncements([]); })
      .finally(() => { if (active) setLoadingAnnouncements(false); });
    funeralApi.listVolunteers()
      .then((res) => { if (active) setVolunteers(res); })
      .catch(() => { if (active) setVolunteers([]); })
      .finally(() => { if (active) setLoadingVolunteers(false); });
    funeralApi.listSteps()
      .then((res) => { if (active) setSteps(res); })
      .catch(() => { if (active) setSteps([]); });
    funeralApi.listSkills()
      .then((res) => { if (active) setSkills(res); })
      .catch(() => { if (active) setSkills([]); });
    return () => { active = false; };
  }, []);

  const stepByKey = useMemo(() => new Map(steps.map((s) => [s.key, s])), [steps]);
  const terminalKey = steps.length ? steps[steps.length - 1].key : undefined;
  const stageLabel = (s: string) => { const st = stepByKey.get(s); return st ? pickStep(st.title, locale) : s; };
  const stagePillStyle = (s: string) => { const c = stepByKey.get(s)?.color ?? '#6b7280'; return { backgroundColor: `${c}1a`, color: c }; };
  const skillByKey = new Map(skills.map((s) => [s.key, s]));
  const taskLabel = (task: VolunteerTask) => { const s = skillByKey.get(task); return s ? pickStep(s.label, locale) : task; };
  const fmtDate = (v: string) => new Date(v).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  // Derived figures — "completed" = the terminal (last active) step.
  const completed = terminalKey ? requests.filter((r) => r.stage === terminalKey).length : 0;
  const pending = requests.length - completed;
  const upcoming = announcements.filter((a) => new Date(a.prayerTime).getTime() >= Date.now()).length;
  const assignedVolunteers = volunteers.filter((v) => v.assignedTask).length;
  const availableVolunteers = volunteers.length - assignedVolunteers;

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (q && !r.deceased.fullName.toLowerCase().includes(q) && !r.reference.toLowerCase().includes(q)) return false;
      if (stageFilter && r.stage !== stageFilter) return false;
      return true;
    });
  }, [requests, query, stageFilter]);

  // Funerals a volunteer can be assigned to (active, i.e. not yet completed).
  const assignableFunerals = useMemo(
    () => requests.filter((r) => r.stage !== terminalKey).map((r) => ({ id: r.id, reference: r.reference, deceasedName: r.deceased.fullName })),
    [requests, terminalKey],
  );

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

  const saveAnnouncement = async (a: FuneralAnnouncement) => {
    const target = announcementForm.initial;
    const editing = target != null;
    const { id: _id, ...payload } = a;
    void _id;
    setAnnouncementForm({ open: false });
    try {
      if (editing) {
        const updated = await funeralApi.updateAnnouncement(target.id, payload);
        setAnnouncements((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await funeralApi.createAnnouncement(payload);
        setAnnouncements((prev) => [created, ...prev]);
      }
      setToast(t(editing ? 'announcements.toastUpdated' : 'announcements.toastCreated', { name: a.name }));
    } catch {
      setToast(t('announcements.toastError'));
    }
  };

  const deleteAnnouncement = (a: FuneralAnnouncement) => {
    setConfirm({
      message: t('announcements.deleteConfirm', { name: a.name }),
      onConfirm: async () => {
        setConfirm(null);
        try {
          await funeralApi.deleteAnnouncement(a.id);
          setAnnouncements((prev) => prev.filter((x) => x.id !== a.id));
          setToast(t('announcements.toastDeleted', { name: a.name }));
        } catch {
          setToast(t('announcements.toastError'));
        }
      },
    });
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

  const upsertVolunteer = (v: Volunteer) =>
    setVolunteers((prev) => (prev.some((x) => x.id === v.id) ? prev.map((x) => (x.id === v.id ? v : x)) : [...prev, v]));

  const assignVolunteer = async (id: string, task: VolunteerTask, requestId: string) => {
    try { upsertVolunteer(await funeralApi.assignVolunteer(id, task, requestId)); } catch { setToast(t('volunteersError')); }
  };
  const unassignVolunteer = async (id: string) => {
    try { upsertVolunteer(await funeralApi.unassignVolunteer(id)); } catch { setToast(t('volunteersError')); }
  };
  const saveVolunteer = async (v: Volunteer) => {
    const exists = volunteers.some((x) => x.id === v.id);
    const payload = { name: v.name, phone: v.phone, mosqueId: v.mosqueId, skills: v.skills };
    try {
      upsertVolunteer(exists ? await funeralApi.updateVolunteer(v.id, payload) : await funeralApi.createVolunteer(payload));
    } catch {
      setToast(t('volunteersError'));
    }
  };
  const deleteVolunteer = async (id: string) => {
    try {
      await funeralApi.deleteVolunteer(id);
      setVolunteers((prev) => prev.filter((v) => v.id !== id));
    } catch {
      setToast(t('volunteersError'));
    }
  };

  const exportRequests = () => {
    const header = [t('requests.col.reference'), t('requests.col.deceased'), t('requests.col.stage'), t('requests.col.progress'), t('requests.col.contact'), t('requests.col.date')];
    const rows = requests.map((r) => [
      r.reference, r.deceased.fullName, stageLabel(r.stage), `${requestProgress(r)}%`, r.family.phone, new Date(r.createdAt).toISOString().slice(0, 10),
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `funeral-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <button onClick={exportRequests} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green">
              <Download className="h-4 w-4" /> {t('export')}
            </button>
          )}
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green">
            <RefreshCw className="h-4 w-4" /> {t('refresh')}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FuneralStatCard icon={Clock} tone="amber" value={pending} label={t('stats.pending')} loading={loadingRequests} />
        <FuneralStatCard icon={Users} tone="green" value={volunteers.length} label={t('stats.volunteers')} loading={loadingVolunteers} />
        <FuneralStatCard icon={Bell} tone="slate" value={upcoming} label={t('stats.upcoming')} loading={loadingAnnouncements} />
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
                  <Link href={`/${locale}/services/funeral/detail/${r.reference}`} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-gray-50 -mx-2 rounded-lg px-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rmc-green/10 text-[11px] font-bold text-rmc-green">
                      {r.deceased.fullName.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-gray-900">{r.deceased.fullName}</p>
                      <p className="font-mono text-[11px] text-gray-400">{r.reference}</p>
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
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
            >
              <option value="">{t('requests.allStages')}</option>
              {steps.map((s) => <option key={s.key} value={s.key}>{stageLabel(s.key)}</option>)}
            </select>
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
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('requests.col.reference')}</th>
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
                        <td className="px-4 py-4 font-mono text-xs font-semibold text-gray-700">{r.reference}</td>
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
                            {(() => {
                              const count = volunteers.filter((v) => v.assignedRequestId === r.id).length;
                              return count > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rmc-green/10 px-2 py-0.5 text-[11px] font-bold text-rmc-green" title={t('requests.attendantsCount', { count })}>
                                  <Users className="h-3 w-3" /> {count}
                                </span>
                              ) : null;
                            })()}
                            {canManage && (
                              <button
                                onClick={() => setManagingRequest(r)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-rmc-green"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" /> {t('requests.manage')}
                              </button>
                            )}
                            <Link href={`/${locale}/services/funeral/detail/${r.reference}`} className="inline-flex items-center gap-1 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark">
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

      {/* ── Announcements ── */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <button
                onClick={() => setAnnouncementForm({ open: true })}
                className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-4 py-2 text-sm font-bold text-white shadow-sm shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
              >
                <Plus className="h-4 w-4" /> {t('announcements.add')}
              </button>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5">
            {loadingAnnouncements ? (
              <div className="flex items-center justify-center p-12 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" aria-label={t('loading')} /></div>
            ) : announcements.length === 0 ? (
              <div className="p-6"><EmptyState icon={Bell} title={t('announcements.emptyTitle')} message={t('announcements.emptyText')} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left rtl:text-right">
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('announcements.col.name')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden sm:table-cell">{t('announcements.col.age')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600">{t('announcements.col.prayer')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden md:table-cell">{t('announcements.col.janazah')}</th>
                      <th className="px-4 py-3.5 font-medium text-gray-600 hidden lg:table-cell">{t('announcements.col.burial')}</th>
                      {canManage && <th className="px-4 py-3.5" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {announcements.map((a) => (
                      <tr key={a.id} className="transition-colors hover:bg-rmc-green/[0.03]">
                        <td className="px-4 py-4 font-medium text-gray-900">{a.name}</td>
                        <td className="px-4 py-4 hidden text-gray-500 sm:table-cell">{a.age}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-600">{new Date(a.prayerTime).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-4 hidden text-gray-500 md:table-cell">{a.janazahLocation}</td>
                        <td className="px-4 py-4 hidden text-gray-500 lg:table-cell">{a.burialLocation}</td>
                        {canManage && (
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setAnnouncementForm({ open: true, initial: a })} aria-label={t('actions.edit')} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-rmc-green">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => deleteAnnouncement(a)} aria-label={t('actions.delete')} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600">
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

      {/* ── Volunteers ── */}
      {tab === 'volunteers' && (
        <VolunteerManagement
          volunteers={volunteers}
          funerals={assignableFunerals}
          skills={skills}
          onAssign={assignVolunteer}
          onUnassign={unassignVolunteer}
          onSaveVolunteer={saveVolunteer}
          onDeleteVolunteer={deleteVolunteer}
          canManage={canManage}
        />
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

      {/* ── Reports ── */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportTile label={t('reports.totalRequests')} value={requests.length} icon={ClipboardList} />
            <ReportTile label={t('reports.completed')} value={completed} icon={CheckCircle2} />
            <ReportTile label={t('reports.volunteersAvailable')} value={availableVolunteers} icon={Users} />
            <ReportTile label={t('reports.volunteersAssigned')} value={assignedVolunteers} icon={UserRound} />
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

          <button onClick={exportRequests} className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark">
            <Download className="h-4 w-4" /> {t('reports.exportRequests')}
          </button>
          {!canManage && <p className="text-[12px] text-gray-400">{t('viewerNote')}</p>}
        </div>
      )}

      {/* ── Dialogs ── */}
      {managingRequest && (
        <RequestStageDialog
          request={managingRequest}
          steps={steps}
          attendants={volunteers.filter((v) => v.assignedRequestId === managingRequest.id)}
          availableVolunteers={volunteers.filter((v) => !v.assignedTask)}
          stageLabel={stageLabel}
          taskLabel={taskLabel}
          canManage={canManage}
          onSave={saveRequestStage}
          onAssignAttendant={(volunteerId, task) => assignVolunteer(volunteerId, task, managingRequest.id)}
          onUnassignAttendant={unassignVolunteer}
          onClose={() => setManagingRequest(null)}
        />
      )}
      {announcementForm.open && (
        <AnnouncementFormDialog
          initial={announcementForm.initial}
          onSave={saveAnnouncement}
          onClose={() => setAnnouncementForm({ open: false })}
        />
      )}
      {cemeteryForm.open && (
        <CemeteryFormDialog
          initial={cemeteryForm.initial}
          onSave={saveCemetery}
          onClose={() => setCemeteryForm({ open: false })}
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
