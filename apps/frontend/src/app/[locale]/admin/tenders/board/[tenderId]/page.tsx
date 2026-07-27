'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
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
import { TenderKanbanBoard } from '@/components/admin/tenders/TenderKanbanBoard';
import { deadlineLabel, getLifecycle } from '@/components/admin/tenders/AdminTenderCard';
import { cn } from '@/lib/utils';
import { resolveI18n, tendersApi, type Tender } from '@/lib/tendersApi';
import { STATUS_COLORS, type TenderApplicationStatus } from '@/lib/tenderApplicationApi';
import { STATUS_LABELS_SHORT } from '@/lib/tenderWorkflow';
import {
  tenderApplicationAdminApi,
  type AdminTenderApplication,
} from '@/lib/tenderApplicationAdminApi';

/**
 * One tender's bids, as a board or a table.
 *
 * The board is the default and gets the whole viewport below the header: the
 * page itself does not scroll, the columns do. That is why the toolbar here is a
 * single compact row rather than the filter panel this page used to carry — a
 * Kanban that only shows two cards before it runs out of height is a list with
 * extra steps.
 */

const PAGE_SIZE = 20;

type ViewMode = 'board' | 'table';

const VIEW_STORAGE_KEY = 'rmc.admin.tenders.view';

const STATUS_OPTIONS: { value: TenderApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'more_info_requested', label: 'More info requested' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export default function AdminTenderBoardPage() {
  return (
    <ProtectedRoute permissions={[Permission.TENDER_VIEW]}>
      <AdminTenderBoardContent />
    </ProtectedRoute>
  );
}

function AdminTenderBoardContent() {
  const { locale, tenderId } = useParams<{ locale: string; tenderId: string }>();
  const { hasPermission } = useAuth();
  const canEvaluate = hasPermission(Permission.TENDER_EVALUATE);
  const canSeeReports = hasPermission(Permission.TENDER_REPORTS);

  const [tender, setTender] = useState<Tender | null>(null);
  const [tenderLoading, setTenderLoading] = useState(true);

  const [view, setView] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Table-only state — the board fetches per column on its own.
  const [applications, setApplications] = useState<AdminTenderApplication[]>([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);

  useEffect(() => {
    tendersApi
      .getById(tenderId)
      .then(setTender)
      .catch(() => setTender(null))
      .finally(() => setTenderLoading(false));
  }, [tenderId]);

  // Restore the last view once mounted — reading localStorage during render
  // would make the server and client markup disagree.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'table' || saved === 'board') setView(saved);
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    // The board has no status filter — its columns are the statuses — so a value
    // left over from the table would narrow it invisibly.
    if (next === 'board') setStatus('');
  };

  const loadTable = useCallback(async () => {
    setTableLoading(true);
    try {
      const result = await tenderApplicationAdminApi.list({
        tenderId,
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
  }, [tenderId, search, status, page]);

  useEffect(() => {
    if (view !== 'table') return;
    const timer = setTimeout(loadTable, 300);
    return () => clearTimeout(timer);
  }, [loadTable, view]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await tenderApplicationAdminApi.exportCsv({
        tenderId,
        search: search || undefined,
        status: view === 'table' ? status || undefined : undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tender-${tenderId}-applications.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const title = tender ? resolveI18n(tender.titleI18n, tender.title, locale) : 'Tender';
  const lifecycle = getLifecycle(tender?.expiresAt ?? null);

  return (
    // The admin shell is h-screen with an h-14 top bar and p-4/sm:p-5 padding —
    // claiming exactly what is left makes the board end at the viewport bottom
    // instead of pushing the page into a scroll.
    <div className="flex h-[calc(100vh-5.5rem)] min-h-0 flex-col sm:h-[calc(100vh-6rem)]">
      {/* Header — one compact block, so the board keeps the height. */}
      <div className="shrink-0 space-y-3">
        <Link
          href={`/${locale}/admin/tenders`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-teal-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All tenders
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {tenderLoading ? (
              <div className="h-5 w-64 animate-pulse rounded bg-gray-100" />
            ) : (
              <h1 className="truncate text-base font-bold text-gray-900" title={title}>
                {title}
              </h1>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>
                {total} bid{total === 1 ? '' : 's'}
              </span>
              {tender && (
                <>
                  <span aria-hidden>·</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold',
                      lifecycle === 'closed'
                        ? 'bg-gray-100 text-gray-500'
                        : lifecycle === 'closing'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-rmc-green/10 text-rmc-green',
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {deadlineLabel(tender.expiresAt)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[190px]">
              <Input
                placeholder="Company, TIN, phone…"
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

            {canSeeReports && (
              <Button
                size="sm"
                variant="outline"
                isLoading={exporting}
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleExport}
              >
                Export
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Board / table — everything below the header, nothing more. */}
      <div className="mt-3 min-h-0 flex-1">
        {view === 'board' ? (
          <TenderKanbanBoard
            locale={locale}
            tenderId={tenderId}
            search={search}
            canEvaluate={canEvaluate}
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
                      <Th>Company</Th>
                      <Th>Bid</Th>
                      <Th>Docs</Th>
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
                            href={`/${locale}/admin/tenders/${app.id}`}
                            className="font-mono text-xs font-semibold text-teal-600 hover:underline"
                          >
                            {app.applicationNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{app.companyName}</p>
                          <p className="text-xs text-gray-400">TIN {app.companyTin}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {app.bidAmount != null
                            ? `${Number(app.bidAmount).toLocaleString()} RWF`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <FileCheck className="h-3.5 w-3.5" />
                            {app.documents.filter((d) => d.verified).length}/{app.documents.length}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold',
                              STATUS_COLORS[app.status],
                            )}
                          >
                            {STATUS_LABELS_SHORT[app.status]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/${locale}/admin/tenders/${app.id}`}
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
