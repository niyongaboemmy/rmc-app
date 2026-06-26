'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  History, ChevronLeft, ChevronRight, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { settingsApi, SmsHistoryItem, SmsHistoryPage } from '@/lib/settingsApi';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const DLR_STATUS: Record<string, { label: string; color: string }> = {
  P: { label: 'Processing',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  D: { label: 'Delivered',   color: 'text-green-700 bg-green-50 border-green-200' },
  Q: { label: 'Queued',      color: 'text-blue-600  bg-blue-50  border-blue-200'  },
  S: { label: 'Sent',        color: 'text-teal-600  bg-teal-50  border-teal-200'  },
  E: { label: 'Errored',     color: 'text-red-600   bg-red-50   border-red-200'   },
  U: { label: 'Undelivered', color: 'text-red-600   bg-red-50   border-red-200'   },
};

const PAGE_SIZE = 20;

export function SmsHistoryTab() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [page, setPage] = useState(1);
  const [data, setData] = useState<SmsHistoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await settingsApi.getSmsHistory(p, PAGE_SIZE);
      setData(result);
    } catch {
      toastRef.current.error('Failed to load SMS history.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(page); }, [load, page]);

  const handlePageChange = (next: number) => {
    setExpandedId(null);
    setPage(next);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-rmc-green" />
          <h2 className="text-sm font-semibold text-gray-900">SMS History</h2>
          {data && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {data.total.toLocaleString()} total
            </span>
          )}
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data?.data.length ? (
          <EmptyState />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient(s)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((item) => (
                    <DesktopRow
                      key={item.id}
                      item={item}
                      expanded={expandedId === item.id}
                      onToggle={() => toggleExpand(item.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {data.data.map((item) => (
                <MobileCard
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() => toggleExpand(item.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                loading={loading}
                onChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Desktop Row ──────────────────────────────────────────────────────────────

function DesktopRow({ item, expanded, onToggle }: {
  item: SmsHistoryItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = item.details && item.details.length > 0;

  return (
    <>
      <tr className={cn('transition-colors', expanded ? 'bg-gray-50' : 'hover:bg-gray-50/60')}>
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
          {new Date(item.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <RecipientsCell recipients={item.recipients} />
        </td>
        <td className="px-4 py-3 max-w-[200px]">
          <p className="text-xs text-gray-700 truncate" title={item.message}>{item.message}</p>
        </td>
        <td className="px-4 py-3">
          <StatusBadge success={item.success} error={item.error} />
        </td>
        <td className="px-4 py-3 text-right text-xs text-gray-600 font-mono whitespace-nowrap">
          {item.cost != null ? `${Number(item.cost).toFixed(2)} RWF` : '—'}
        </td>
        <td className="px-4 py-3 text-right text-xs text-gray-600 font-mono whitespace-nowrap">
          {item.balanceAfter != null ? `${Number(item.balanceAfter).toLocaleString()} RWF` : '—'}
        </td>
        <td className="px-4 py-3">
          {hasDetails && (
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-rmc-green transition-colors"
              title="View delivery details"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </td>
      </tr>

      {expanded && hasDetails && (
        <tr>
          <td colSpan={7} className="px-4 pb-3 bg-gray-50">
            <DetailsExpanded item={item} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function MobileCard({ item, expanded, onToggle }: {
  item: SmsHistoryItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = item.details && item.details.length > 0;

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <RecipientsCell recipients={item.recipients} />
          <p className="text-xs text-gray-500 mt-0.5 truncate" title={item.message}>{item.message}</p>
        </div>
        <StatusBadge success={item.success} error={item.error} />
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{new Date(item.createdAt).toLocaleString()}</span>
        {item.cost != null && <span className="font-mono">{Number(item.cost).toFixed(2)} RWF</span>}
      </div>

      {hasDetails && (
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs text-rmc-green font-medium"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide details' : 'View details'}
        </button>
      )}

      {expanded && hasDetails && <DetailsExpanded item={item} />}
    </div>
  );
}

// ─── Expanded Details ─────────────────────────────────────────────────────────

function DetailsExpanded({ item }: { item: SmsHistoryItem }) {
  return (
    <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600">
        Delivery Details
      </div>
      <div className="divide-y divide-gray-100">
        {(item.details ?? []).map((d, i) => {
          const typed = d as { status: string; recipient: string; messageId: number; cost: number };
          const s = DLR_STATUS[typed.status] ?? { label: typed.status, color: 'text-gray-600 bg-gray-50 border-gray-200' };
          return (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
              <div>
                <p className="font-mono text-gray-800">{typed.recipient}</p>
                {typed.messageId > 0 && <p className="text-gray-400 mt-0.5">ID: {typed.messageId}</p>}
              </div>
              <div className="flex items-center gap-3">
                {typed.cost != null && (
                  <span className="text-gray-500 font-mono">{Number(typed.cost).toFixed(2)} RWF</span>
                )}
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold', s.color)}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RecipientsCell({ recipients }: { recipients: string[] }) {
  if (recipients.length === 1) {
    return <p className="text-xs font-mono text-gray-800">{recipients[0]}</p>;
  }
  return (
    <div>
      <p className="text-xs font-mono text-gray-800">{recipients[0]}</p>
      <p className="text-[11px] text-gray-400">+{recipients.length - 1} more</p>
    </div>
  );
}

function StatusBadge({ success, error }: { success: boolean; error: string | null }) {
  if (success) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">
        <CheckCircle2 className="w-3 h-3" /> Sent
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap"
      title={error ?? undefined}
    >
      <XCircle className="w-3 h-3" /> Failed
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 gap-3">
      <AlertCircle className="w-8 h-8 opacity-30" />
      <p className="text-sm">No messages sent yet</p>
      <p className="text-xs">Messages sent via the SMS gateway will appear here</p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  loading: boolean;
  onChange: (p: number) => void;
}

function Pagination({ page, totalPages, total, limit, loading, onChange }: PaginationProps) {
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const pages = buildPageRange(page, totalPages);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 flex-wrap gap-3">
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total.toLocaleString()}</span> messages
      </p>

      <div className="flex items-center gap-1">
        <PageButton onClick={() => onChange(page - 1)} disabled={page <= 1 || loading}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </PageButton>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
          ) : (
            <PageButton
              key={p}
              onClick={() => onChange(p as number)}
              disabled={loading}
              active={p === page}
            >
              {p}
            </PageButton>
          ),
        )}

        <PageButton onClick={() => onChange(page + 1)} disabled={page >= totalPages || loading}>
          <ChevronRight className="w-3.5 h-3.5" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  children, onClick, disabled, active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-rmc-green text-white'
          : 'text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

function buildPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [1];

  if (current > 3) pages.push('…');

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('…');

  pages.push(total);
  return pages;
}
