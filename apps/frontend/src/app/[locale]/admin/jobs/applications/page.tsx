'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Eye,
  Inbox,
  KanbanSquare,
  Loader2,
  Search,
  Table2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { JobKanbanBoard } from '@/components/admin/jobs/JobKanbanBoard';
import { cn } from '@/lib/utils';
import { JOB_STATUS_COLORS, type JobApplication, type JobApplicationStatus } from '@/lib/jobsApi';
import { jobsAdminApi } from '@/lib/jobsAdminApi';
import { STATUS_LABELS_SHORT, JOB_BOARD_COLUMNS } from '@/lib/jobWorkflow';

/**
 * Job applications, as a board or a table. Mirrors the tender board page
 * (app/[locale]/admin/tenders/applications/board/[tenderId]/page.tsx) — a compact toolbar over
 * a full-viewport board that scrolls inside itself — but is global across every
 * posting rather than scoped to one tender.
 */

const PAGE_SIZE = 20;
type ViewMode = 'board' | 'table';
const VIEW_STORAGE_KEY = 'rmc.admin.jobs.view';

const STATUS_OPTIONS: { value: JobApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  ...JOB_BOARD_COLUMNS.map((c) => ({ value: c.status, label: c.label })),
];

export default function AdminJobsPage() {
  return (
    <ProtectedRoute permissions={[Permission.JOB_APPLICATIONS_VIEW]}>
      <AdminJobsContent />
    </ProtectedRoute>
  );
}

function AdminJobsContent() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.JOB_APPLICATIONS_MANAGE);

  const [view, setView] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [total, setTotal] = useState(0);

  // Table-only state — the board fetches per column on its own.
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'table' || saved === 'board') setView(saved);
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    if (next === 'board') setStatus(''); // the board's columns ARE the statuses
  };

  const loadTable = useCallback(async () => {
    setTableLoading(true);
    try {
      const result = await jobsAdminApi.list({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setApplications(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      setApplications([]);
      setTotal(0);
      setPages(1);
    } finally {
      setTableLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    if (view !== 'table') return;
    const timer = setTimeout(loadTable, 300);
    return () => clearTimeout(timer);
  }, [loadTable, view]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  return (
    <div className="flex h-[calc(100vh-5.5rem)] min-h-0 flex-col sm:h-[calc(100vh-6rem)]">
      {/* Header — one compact block, so the board keeps the height. */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
              <Briefcase className="h-5 w-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900">Job Applications</h1>
              <p className="text-xs text-gray-400">
                {total} application{total === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Wider than the 200px it was: this box takes a name, a position or a
                phone number, and 200px truncated all three. Capped rather than elastic so
                it does not crowd the status select and the view toggle beside it. */}
            <div className="w-full sm:w-[340px]">
              <Input
                placeholder="Name, position, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            {view === 'table' && (
              <div className="w-[170px]">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
              </div>
            )}

            <ViewToggle view={view} onChange={changeView} />
          </div>
        </div>
      </div>

      {/* Board / table — everything below the header, nothing more. */}
      <div className="mt-3 min-h-0 flex-1">
        {view === 'board' ? (
          <JobKanbanBoard
            locale={locale}
            search={search}
            canManage={canManage}
            onTotalChange={setTotal}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              {tableLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                </div>
              ) : applications.length === 0 ? (
                <div className="py-16 text-center">
                  <Inbox className="mx-auto mb-3 h-9 w-9 text-gray-300" />
                  <p className="text-sm text-gray-400">No applications match these filters.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
                    <tr className="border-b border-gray-100 text-left">
                      <Th>Reference</Th>
                      <Th>Applicant</Th>
                      <Th>Position</Th>
                      <Th>Status</Th>
                      <Th>Submitted</Th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b border-gray-50 transition-colors hover:bg-teal-50/20"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/${locale}/admin/jobs/applications/${app.id}`}
                            className="font-mono text-xs font-semibold text-teal-600 hover:underline"
                          >
                            {app.trackingNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{app.fullNames}</p>
                          <p className="text-xs text-gray-400">{app.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{app.positionAppliedFor}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold',
                              JOB_STATUS_COLORS[app.status],
                            )}
                          >
                            {STATUS_LABELS_SHORT[app.status]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                          {new Date(app.submittedAt ?? app.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/${locale}/admin/jobs/applications/${app.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-teal-400 hover:text-teal-600"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {pages > 1 && (
              <div className="flex shrink-0 items-center justify-between">
                <p className="text-xs text-gray-400">
                  Page {page} of {pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'board', label: 'Board', icon: <KanbanSquare className="h-4 w-4" /> },
    { value: 'table', label: 'Table', icon: <Table2 className="h-4 w-4" /> },
  ];

  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="inline-flex items-center gap-0.5 rounded-lg border-2 border-gray-200 bg-gray-50 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={view === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            view === option.value
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </th>
  );
}
