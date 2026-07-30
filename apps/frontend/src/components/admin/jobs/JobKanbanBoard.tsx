'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Ban,
  Eye,
  GripVertical,
  Inbox,
  Loader2,
  Mail,
  Move,
  Phone,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ConfirmModal,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { JobApplication, JobApplicationStatus } from '@/lib/jobsApi';
import { jobsAdminApi, type JobStatusAction } from '@/lib/jobsAdminApi';
import {
  STATUS_LABELS,
  JOB_BOARD_COLUMNS,
  TERMINAL_STATUSES,
  jobApiError,
  jobMoveRule,
  type JobBoardColumn,
} from '@/lib/jobWorkflow';

/**
 * How many cards each column holds before it asks for more. Columns are fetched
 * one request each rather than one big page split client-side, so every column
 * header shows a true count and a busy pipeline doesn't drag hundreds of
 * applications into the browser to render forty of them.
 */
const COLUMN_PAGE_SIZE = 25;

interface ColumnState {
  items: JobApplication[];
  /** Server-side count for this status under the current filters. */
  total: number;
  loading: boolean;
  /** How many cards this column has asked the server for (grows on "load more"). */
  limit: number;
}

type BoardState = Record<JobApplicationStatus, ColumnState>;

/** A move the reviewer has started but that has not been sent to the backend yet. */
interface PendingMove {
  app: JobApplication;
  from: JobApplicationStatus;
  to: JobApplicationStatus;
  action: JobStatusAction;
}

/** Copy for the "are you sure?" step on the one-click decisions. */
const CONFIRM_COPY: Partial<
  Record<JobStatusAction, { title: string; message: string; confirmLabel: string }>
> = {
  shortlist: {
    title: 'Shortlist this application?',
    message: 'It will be marked as shortlisted for the role.',
    confirmLabel: 'Shortlist',
  },
  accept: {
    title: 'Accept this application?',
    message: 'The applicant will be notified by SMS and email that they were accepted.',
    confirmLabel: 'Accept',
  },
};

function emptyBoard(loading: boolean): BoardState {
  return JOB_BOARD_COLUMNS.reduce((acc, col) => {
    acc[col.status] = { items: [], total: 0, loading, limit: COLUMN_PAGE_SIZE };
    return acc;
  }, {} as BoardState);
}

export interface JobKanbanBoardProps {
  locale: string;
  search: string;
  /** JOB_APPLICATIONS_MANAGE — without it the board is read-only: no dragging, no move menu. */
  canManage: boolean;
  /** Reports the summed column totals so the page header can show one number. */
  onTotalChange?: (total: number) => void;
}

/**
 * The job-application pipeline as a board: one column per status, cards dragged
 * between them to move an application along. Every drop routes through the same
 * evaluation actions the detail page uses, so notifications and status history
 * are identical — the board is a faster way to drive the flow, not a second one.
 *
 * Cloned from the tender board (components/admin/tenders/TenderKanbanBoard): the
 * mechanics — native HTML5 drag-and-drop plus an accessible/touch Move picker,
 * per-column independent fetch, a stale-request guard and optimistic-move
 * rollback — are identical; only the data shape and card fields differ.
 */
export function JobKanbanBoard({ locale, search, canManage, onTotalChange }: JobKanbanBoardProps) {
  const { success, error: toastError } = useToast();

  const [board, setBoard] = useState<BoardState>(() => emptyBoard(true));
  // Mirror for the rollback snapshot — reading state inside an async handler
  // would close over the value from the render that started the move.
  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const [drag, setDrag] = useState<{ id: string; from: JobApplicationStatus } | null>(null);
  const [hoverColumn, setHoverColumn] = useState<JobApplicationStatus | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // One pending move at a time, held while its modal collects what the backend needs.
  const [confirmMove, setConfirmMove] = useState<PendingMove | null>(null);
  const [rejectMove, setRejectMove] = useState<PendingMove | null>(null);
  const [moreInfoMove, setMoreInfoMove] = useState<PendingMove | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [moreInfoNotes, setMoreInfoNotes] = useState('');
  /** Card whose Move picker is open — the touch/keyboard path into the same moves. */
  const [movePicker, setMovePicker] = useState<JobApplication | null>(null);

  // Guards against a slow response for an old filter landing after a fast one.
  const requestRef = useRef(0);

  const loadBoard = useCallback(async () => {
    const token = ++requestRef.current;
    setBoard((prev) => {
      const next = { ...prev };
      for (const col of JOB_BOARD_COLUMNS) next[col.status] = { ...next[col.status], loading: true };
      return next;
    });

    const entries = await Promise.all(
      JOB_BOARD_COLUMNS.map(async (col): Promise<[JobApplicationStatus, ColumnState]> => {
        try {
          const result = await jobsAdminApi.list({
            search: search || undefined,
            status: col.status,
            page: 1,
            limit: COLUMN_PAGE_SIZE,
          });
          return [
            col.status,
            { items: result.items, total: result.total, loading: false, limit: COLUMN_PAGE_SIZE },
          ];
        } catch {
          return [col.status, { items: [], total: 0, loading: false, limit: COLUMN_PAGE_SIZE }];
        }
      }),
    );

    if (token !== requestRef.current) return; // a newer filter change already won
    setBoard(Object.fromEntries(entries) as BoardState);
  }, [search]);

  // Debounced so typing in the search box doesn't fire seven requests a keystroke.
  useEffect(() => {
    const timer = setTimeout(loadBoard, 300);
    return () => clearTimeout(timer);
  }, [loadBoard]);

  useEffect(() => {
    const total = JOB_BOARD_COLUMNS.reduce((sum, col) => sum + board[col.status].total, 0);
    onTotalChange?.(total);
  }, [board, onTotalChange]);

  /** Widens one column's window and re-reads it from the top. */
  const loadMore = async (status: JobApplicationStatus) => {
    const nextLimit = boardRef.current[status].limit + COLUMN_PAGE_SIZE;
    setBoard((prev) => ({ ...prev, [status]: { ...prev[status], loading: true } }));
    try {
      const result = await jobsAdminApi.list({
        search: search || undefined,
        status,
        page: 1,
        limit: nextLimit,
      });
      setBoard((prev) => ({
        ...prev,
        [status]: { items: result.items, total: result.total, loading: false, limit: nextLimit },
      }));
    } catch {
      setBoard((prev) => ({ ...prev, [status]: { ...prev[status], loading: false } }));
      toastError('Could not load more applications.');
    }
  };

  // ── Moving a card ──────────────────────────────────────────────────────────

  /** Lifts the card out of one column and drops it at the top of another. */
  const shiftCard = (
    state: BoardState,
    appId: string,
    from: JobApplicationStatus,
    to: JobApplicationStatus,
  ): BoardState => {
    const card = state[from].items.find((a) => a.id === appId);
    if (!card) return state;
    return {
      ...state,
      [from]: {
        ...state[from],
        items: state[from].items.filter((a) => a.id !== appId),
        total: Math.max(0, state[from].total - 1),
      },
      [to]: {
        ...state[to],
        items: [{ ...card, status: to }, ...state[to].items],
        total: state[to].total + 1,
      },
    };
  };

  /**
   * Sends the move and settles the card. `optimistic` moves jump columns under
   * the cursor and snap back if the backend refuses; modal-gated moves wait for
   * the response. Returns whether the move landed, so a form modal can stay open
   * on failure rather than throwing away what was typed into it.
   */
  const runMove = async (
    move: PendingMove,
    extra: { notes?: string; reason?: string } = {},
    { optimistic = false }: { optimistic?: boolean } = {},
  ): Promise<boolean> => {
    const { app, from, to, action } = move;
    const before = boardRef.current;

    setBusyId(app.id);
    if (optimistic) setBoard((prev) => shiftCard(prev, app.id, from, to));

    try {
      const updated = await jobsAdminApi.updateStatus(app.id, { action, ...extra });
      setBoard((prev) => {
        const shifted = optimistic ? prev : shiftCard(prev, app.id, from, to);
        // Adopt the server's copy — it carries the review notes / rejection reason.
        return {
          ...shifted,
          [to]: {
            ...shifted[to],
            items: shifted[to].items.map((a) => (a.id === app.id ? { ...a, ...updated } : a)),
          },
        };
      });
      success(`${app.fullNames} → ${STATUS_LABELS[to]}`);
      return true;
    } catch (err) {
      if (optimistic) setBoard(before); // a card left in the wrong column reads as done
      toastError(jobApiError(err, 'Could not move that application.'));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Entry point for both the drop and the Move picker. Decides whether the move
   * can go straight through or needs the reviewer to write something first.
   */
  const beginMove = (app: JobApplication, to: JobApplicationStatus) => {
    const rule = jobMoveRule(app.status, to);
    if (!rule.allowed) {
      toastError(rule.reason);
      return;
    }

    const move: PendingMove = { app, from: app.status, to, action: rule.action };
    switch (rule.action) {
      case 'request_more_info':
        setMoreInfoNotes('');
        setMoreInfoMove(move);
        break;
      case 'reject':
        setRejectReason('');
        setRejectMove(move);
        break;
      // Starting a review takes no input — one gesture, moves the card instantly.
      case 'start_review':
        runMove(move, {}, { optimistic: true });
        break;
      default:
        setConfirmMove(move);
    }
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onCardDragStart = (e: React.DragEvent, app: JobApplication) => {
    setDrag({ id: app.id, from: app.status });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', app.id); // Firefox needs a payload
  };

  const endDrag = () => {
    setDrag(null);
    setHoverColumn(null);
  };

  const onColumnDrop = (e: React.DragEvent, to: JobApplicationStatus) => {
    e.preventDefault();
    const active = drag;
    endDrag();
    if (!active) return;
    const app = boardRef.current[active.from].items.find((a) => a.id === active.id);
    if (app) beginMove(app, to);
  };

  const totalLoaded = JOB_BOARD_COLUMNS.reduce((sum, col) => sum + board[col.status].items.length, 0);
  const anyLoading = JOB_BOARD_COLUMNS.some((col) => board[col.status].loading);

  if (anyLoading && totalLoaded === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto overflow-y-hidden pb-1">
        {JOB_BOARD_COLUMNS.map((column) => (
          <BoardColumn
            key={column.status}
            column={column}
            state={board[column.status]}
            locale={locale}
            canManage={canManage}
            drag={drag}
            isHovered={hoverColumn === column.status}
            busyId={busyId}
            onDragStart={onCardDragStart}
            onDragEnd={endDrag}
            onHover={setHoverColumn}
            onDrop={onColumnDrop}
            onOpenMovePicker={setMovePicker}
            onLoadMore={() => loadMore(column.status)}
          />
        ))}
      </div>

      {/* Move picker — the touch and keyboard path to every legal transition. */}
      <MovePickerModal
        app={movePicker}
        onClose={() => setMovePicker(null)}
        onPick={(to) => {
          const app = movePicker;
          setMovePicker(null);
          if (app) beginMove(app, to);
        }}
      />

      {confirmMove && CONFIRM_COPY[confirmMove.action] && (
        <ConfirmModal
          open
          onClose={() => setConfirmMove(null)}
          onConfirm={async () => {
            await runMove(confirmMove);
            setConfirmMove(null);
          }}
          title={CONFIRM_COPY[confirmMove.action]!.title}
          message={`${confirmMove.app.fullNames} — ${CONFIRM_COPY[confirmMove.action]!.message}`}
          confirmLabel={CONFIRM_COPY[confirmMove.action]!.confirmLabel}
          isLoading={busyId === confirmMove.app.id}
        />
      )}

      {/* Rejecting needs a reason the applicant will read — a form, not a confirm. */}
      <Modal open={!!rejectMove} onClose={() => setRejectMove(null)} size="md">
        <ModalHeader>
          <ModalTitle>Reject this application?</ModalTitle>
          {rejectMove && (
            <p className="mt-1 text-sm text-gray-500">
              {rejectMove.app.fullNames} · {rejectMove.app.trackingNumber}
            </p>
          )}
        </ModalHeader>
        <ModalBody>
          <Textarea
            label="Reason for rejection"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            hint="Sent to the applicant by SMS and email."
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setRejectMove(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!rejectReason.trim()}
            isLoading={!!rejectMove && busyId === rejectMove.app.id}
            onClick={async () => {
              if (!rejectMove) return;
              const ok = await runMove(rejectMove, { reason: rejectReason.trim() });
              if (ok) setRejectMove(null); // on failure the reason stays typed
            }}
          >
            Reject application
          </Button>
        </ModalFooter>
      </Modal>

      {/* Requesting more info needs a note explaining what's missing. */}
      <Modal open={!!moreInfoMove} onClose={() => setMoreInfoMove(null)} size="md">
        <ModalHeader>
          <ModalTitle>Request more information</ModalTitle>
          {moreInfoMove && (
            <p className="mt-1 text-sm text-gray-500">
              {moreInfoMove.app.fullNames} · {moreInfoMove.app.trackingNumber}
            </p>
          )}
        </ModalHeader>
        <ModalBody>
          <Textarea
            label="What does the applicant need to provide?"
            rows={4}
            value={moreInfoNotes}
            onChange={(e) => setMoreInfoNotes(e.target.value)}
            hint="Sent to the applicant by SMS and email."
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setMoreInfoMove(null)}>
            Cancel
          </Button>
          <Button
            disabled={!moreInfoNotes.trim()}
            isLoading={!!moreInfoMove && busyId === moreInfoMove.app.id}
            onClick={async () => {
              if (!moreInfoMove) return;
              const ok = await runMove(moreInfoMove, { notes: moreInfoNotes.trim() });
              if (ok) setMoreInfoMove(null); // on failure the note survives
            }}
          >
            Send request
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

// ── Column ───────────────────────────────────────────────────────────────────

function BoardColumn({
  column,
  state,
  locale,
  canManage,
  drag,
  isHovered,
  busyId,
  onDragStart,
  onDragEnd,
  onHover,
  onDrop,
  onOpenMovePicker,
  onLoadMore,
}: {
  column: JobBoardColumn;
  state: ColumnState;
  locale: string;
  canManage: boolean;
  drag: { id: string; from: JobApplicationStatus } | null;
  isHovered: boolean;
  busyId: string | null;
  onDragStart: (e: React.DragEvent, app: JobApplication) => void;
  onDragEnd: () => void;
  onHover: (status: JobApplicationStatus | null) => void;
  onDrop: (e: React.DragEvent, to: JobApplicationStatus) => void;
  onOpenMovePicker: (app: JobApplication) => void;
  onLoadMore: () => void;
}) {
  const rule = drag ? jobMoveRule(drag.from, column.status) : null;
  const acceptsDrop = rule?.allowed ?? false;
  const dimmed = !!drag && !acceptsDrop && drag.from !== column.status;
  const hasMore = state.items.length < state.total;

  return (
    <section
      aria-label={column.label}
      className={cn(
        'flex h-full min-h-0 w-[280px] shrink-0 flex-col rounded-2xl border border-gray-200/80 bg-gray-100/60 transition-all',
        dimmed && 'opacity-40',
        acceptsDrop && 'ring-2 ring-dashed',
        acceptsDrop && !isHovered && 'ring-gray-300',
        acceptsDrop && isHovered && column.dropRing,
      )}
      onDragOver={(e) => {
        if (!acceptsDrop) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isHovered) onHover(column.status);
      }}
      onDrop={(e) => acceptsDrop && onDrop(e, column.status)}
    >
      <header className="shrink-0 border-b border-gray-200/70 px-3.5 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', column.dot)} />
          <h2 className="truncate text-[13px] font-bold text-gray-800">{column.label}</h2>
          {column.status === 'accepted' && <Trophy className="h-3.5 w-3.5 shrink-0 text-green-600" />}
          <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-500 ring-1 ring-gray-200">
            {state.total}
          </span>
        </div>
        <p className="mt-0.5 truncate pl-4 text-[11px] text-gray-400">{column.hint}</p>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2.5">
        {state.loading && state.items.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
          </div>
        ) : state.items.length === 0 ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-xl py-10 text-center transition-colors',
              acceptsDrop && 'border-2 border-dashed border-gray-300 bg-white/50',
            )}
          >
            <Inbox className="mb-1.5 h-6 w-6 text-gray-300" />
            <p className="text-[11px] text-gray-400">
              {acceptsDrop ? 'Drop an application here' : 'Nothing here'}
            </p>
          </div>
        ) : (
          state.items.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              locale={locale}
              canManage={canManage}
              isDragging={drag?.id === app.id}
              isBusy={busyId === app.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onOpenMovePicker={onOpenMovePicker}
            />
          ))
        )}

        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={state.loading}
            className="w-full rounded-xl border border-dashed border-gray-200 py-2 text-[11px] font-semibold text-gray-500 transition-colors hover:border-teal-300 hover:text-teal-600 disabled:opacity-50"
          >
            {state.loading ? 'Loading…' : `Load ${state.total - state.items.length} more`}
          </button>
        )}
      </div>
    </section>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  locale,
  canManage,
  isDragging,
  isBusy,
  onDragStart,
  onDragEnd,
  onOpenMovePicker,
}: {
  app: JobApplication;
  locale: string;
  canManage: boolean;
  isDragging: boolean;
  isBusy: boolean;
  onDragStart: (e: React.DragEvent, app: JobApplication) => void;
  onDragEnd: () => void;
  onOpenMovePicker: (app: JobApplication) => void;
}) {
  // A rejected or cancelled application is closed — no grip or move button.
  const movable = canManage && !TERMINAL_STATUSES.includes(app.status);
  const submitted = app.submittedAt ?? app.createdAt;

  return (
    <article
      draggable={movable && !isBusy}
      onDragStart={(e) => onDragStart(e, app)}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all',
        movable && 'cursor-grab active:cursor-grabbing hover:border-teal-200 hover:shadow',
        isDragging && 'opacity-40',
        isBusy && 'pointer-events-none opacity-60',
      )}
    >
      <div className="flex items-start gap-1.5">
        {movable && (
          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-gray-400" />
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/${locale}/admin/jobs/${app.id}`}
            className="font-mono text-[11px] font-semibold text-teal-600 hover:underline"
          >
            {app.trackingNumber}
          </Link>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{app.fullNames}</p>
          <p className="truncate text-[11px] text-gray-400">{app.positionAppliedFor}</p>
        </div>
        {isBusy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-teal-500" />}
      </div>

      <div className="mt-2 space-y-0.5 border-t border-gray-50 pt-2 text-[11px] text-gray-500">
        {app.email && (
          <p className="flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate">{app.email}</span>
          </p>
        )}
        <p className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 truncate">
            <Phone className="h-3 w-3 shrink-0 text-gray-400" /> {app.phone}
          </span>
          <span className="shrink-0 text-gray-400">
            {submitted ? new Date(submitted).toLocaleDateString() : '—'}
          </span>
        </p>
      </div>

      <div className="mt-2 flex gap-1.5">
        <Link
          href={`/${locale}/admin/jobs/${app.id}`}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-teal-400 hover:text-teal-600"
        >
          <Eye className="h-3 w-3" /> Open
        </Link>
        {movable && (
          <button
            type="button"
            onClick={() => onOpenMovePicker(app)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-teal-400 hover:text-teal-600"
            aria-label={`Move ${app.fullNames} to another stage`}
          >
            <Move className="h-3 w-3" /> Move
          </button>
        )}
      </div>
    </article>
  );
}

// ── Move picker ──────────────────────────────────────────────────────────────

/**
 * Every column listed with the reason it is or isn't available. This is the only
 * way to move an application on a touch device — HTML5 drag events never fire
 * there — and the only keyboard-operable one.
 */
function MovePickerModal({
  app,
  onClose,
  onPick,
}: {
  app: JobApplication | null;
  onClose: () => void;
  onPick: (to: JobApplicationStatus) => void;
}) {
  return (
    <Modal open={!!app} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Move application</ModalTitle>
        {app && (
          <p className="mt-1 text-sm text-gray-500">
            {app.fullNames} · currently {STATUS_LABELS[app.status].toLowerCase()}
          </p>
        )}
      </ModalHeader>
      <ModalBody>
        <ul className="space-y-2">
          {app &&
            JOB_BOARD_COLUMNS.filter((col) => col.status !== app.status).map((col) => {
              const rule = jobMoveRule(app.status, col.status);
              return (
                <li key={col.status}>
                  <button
                    type="button"
                    disabled={!rule.allowed}
                    onClick={() => onPick(col.status)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                      rule.allowed
                        ? 'border-gray-200 hover:border-teal-400 hover:bg-teal-50/40'
                        : 'cursor-not-allowed border-gray-100 bg-gray-50',
                    )}
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', col.dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{col.label}</span>
                      <span className="block text-xs text-gray-500">
                        {rule.allowed ? col.hint : rule.reason}
                      </span>
                    </span>
                    {rule.allowed ? (
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <Ban className="h-4 w-4 shrink-0 text-gray-300" />
                    )}
                  </button>
                </li>
              );
            })}
        </ul>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
