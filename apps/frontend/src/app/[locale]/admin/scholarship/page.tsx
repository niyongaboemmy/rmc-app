'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Search, GraduationCap, ChevronRight, RefreshCw, LayoutGrid, List as ListIcon,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ScholarshipKanbanBoard } from '@/components/admin/scholarship/ScholarshipKanbanBoard';
import { useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import {
  type ScholarshipApplication, type ScholarshipApplicationStatus, type ScholarshipProgram,
  type I18nText, type RequiredDocument,
  STATUS_COLORS,
} from '@/lib/scholarshipApi';
import { scholarshipAdminApi } from '@/lib/scholarshipAdminApi';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';

/**
 * SearchableSelect trigger sized to sit level with the plain inputs beside it.
 * Only geometry — the component's own green focus ring is the one we want, so
 * there is nothing to override.
 */
const SELECT_TRIGGER = 'rounded-lg border-gray-300 px-3 py-2 text-sm';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'confirmed', label: 'Confirmed' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      STATUS_COLORS[status as ScholarshipApplicationStatus] ?? 'bg-gray-100 text-gray-700',
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Applications tab ─────────────────────────────────────────────────────────

function ApplicationsTab() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canApprove = hasPermission(Permission.SCHOLARSHIP_APPROVE);

  const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  /**
   * List or board. The board is the same pipeline the list shows, laid out so a
   * reviewer can move an application by dragging it — it lived on its own route
   * reachable only from a row icon on Manage scholarships, which meant nobody
   * working this screen ever found it.
   */
  const [view, setView] = useState<'list' | 'board'>('list');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // Applications now belong to a scholarship, so "show me applicants for the S4
  // bursary" is the first question a reviewer asks. The backend has supported
  // this filter all along; only the control was missing.
  const [programFilter, setProgramFilter] = useState('');
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);

  // Every scholarship, including closed ones — a reviewer still works through
  // applications after the call has closed.
  useEffect(() => {
    scholarshipAdminApi.listPrograms().then(setPrograms).catch(() => setPrograms([]));
  }, []);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await scholarshipAdminApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        programId: programFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });
      setApplications(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, programFilter, dateFrom, dateTo, page]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  return (
    <div className="space-y-6">
      {/* No summary cards and no inline reports panel here. Both moved to the
          Reports page when the sidebar gained submenus — leaving them would mean
          two screens showing the same numbers, free to disagree. This screen is
          the working list: filters, then results. */}

      {/* List | Board. The board needs ONE scholarship (applicants for different
          awards are not competing), so it reuses the Scholarship filter below
          rather than introducing a second picker that could disagree with it. */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
        {(['list', 'board'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              view === v ? 'bg-rmc-green text-white' : 'text-gray-500 hover:text-gray-800',
            )}
          >
            {v === 'list' ? <ListIcon className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {v === 'list' ? 'List' : 'Board'}
          </button>
        ))}
      </div>

      {/* Filters — same shape as the Reports page, every control labelled, and
          the app's green accent throughout. Two screens in one section should
          not look like two different products. */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[14rem] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Name or phone…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Status</label>
            <div className="w-44">
              <SearchableSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                options={STATUS_OPTIONS}
                triggerClassName={SELECT_TRIGGER}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Scholarship</label>
            {/* The one that most needs search: this list grows with every call
                RMC announces. */}
            <div className="w-56">
              <SearchableSelect
                value={programFilter}
                onChange={(v) => { setProgramFilter(v); setPage(1); }}
                options={[
                  { value: '', label: 'All scholarships' },
                  ...programs.map((p) => ({ value: p.id, label: p.title })),
                ]}
                searchPlaceholder="Find a scholarship…"
                triggerClassName={SELECT_TRIGGER}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
            />
          </div>

          {/* Only when something is set — a permanently visible Clear on an
              unfiltered list is a button that does nothing. */}
          {(search || statusFilter || programFilter || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setSearch(''); setStatusFilter(''); setProgramFilter('');
                setDateFrom(''); setDateTo(''); setPage(1);
              }}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      {view === 'board' && !programFilter && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <LayoutGrid className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">Choose a scholarship</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-400">
            The board shows one scholarship&apos;s pipeline. Applicants for different
            awards are not competing with each other, so there is nothing to compare
            across a mixed board.
          </p>
        </div>
      )}

      {view === 'board' && programFilter && (
        <ScholarshipKanbanBoard
          key={programFilter}
          locale={locale}
          programId={programFilter}
          canApprove={canApprove}
        />
      )}

      {/* Table — list view only */}
      {view === 'list' && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-rmc-green animate-spin" />
            <span className="ml-2 text-gray-500">Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No applications found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">Applicant</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Application #</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">School</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3.5 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-rmc-green-light/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{app.fullNames}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{app.phone}</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600 font-mono">
                        {app.applicationNumber}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600">{app.schoolName}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/${locale}/admin/scholarship/${app.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rmc-green hover:text-rmc-green-dark transition-colors"
                        >
                          Review <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} applications
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rmc-green/40 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    disabled={page === pages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 hover:border-rmc-green/40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminScholarshipContent() {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-rmc-green" />
            Scholarships
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review and decide scholarship applications</p>
        </div>
      </div>

      <ApplicationsTab />
    </div>
  );
}

export default function AdminScholarshipPage() {
  return (
    <ProtectedRoute permissions={[Permission.SCHOLARSHIP_VIEW]}>
      {/* The board reports every move through a toast. ToastContext has a
          NO-OP default, so without a provider a refused move would fail
          silently — the reviewer would see the card snap back with no reason. */}
      <ToastProvider>
        <AdminScholarshipContent />
      </ToastProvider>
    </ProtectedRoute>
  );
}
