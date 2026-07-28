'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Ban,
  Eye,
  FileCheck,
  GripVertical,
  Inbox,
  Loader2,
  Move,
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
import { resolveI18n } from '@/lib/tendersApi';
import type { TenderApplicationStatus } from '@/lib/tenderApplicationApi';
import {
  tenderApplicationAdminApi,
  type AdminTenderApplication,
  type TenderStatusAction,
} from '@/lib/tenderApplicationAdminApi';
import {
  STATUS_LABELS,
  TENDER_BOARD_COLUMNS,
  TERMINAL_STATUSES,
  tenderApiError,
  tenderMoveRule,
  type TenderBoardColumn,
} from '@/lib/tenderWorkflow';
import { RequestMoreInfoModal, type MoreInfoPayload } from './RequestMoreInfoModal';

/**
 * How many cards each column holds before it asks for more. Columns are fetched
 * one request each rather than one big page split client-side, so every column
 * header shows a true count and a busy pipeline doesn't drag 500 bids into the
 * browser to render forty of them.
 */
const COLUMN_PAGE_SIZE = 25;

interface ColumnState {
  items: AdminTenderApplication[];
  /** Server-side count for this status under the current filters. */
  total: number;
  loading: boolean;
  /**
   * How many cards this column has asked the server for. A column always reads
   * page 1 and grows this window rather than paging — cards leave a column as
   * soon as they are moved, and an offset computed against a list that just got
   * shorter skips whichever bid slid up into it.
   */
  limit: number;
}

type BoardState = Record<TenderApplicationStatus, ColumnState>;

/** A move the reviewer has started but that has not been sent to the backend yet. */
interface PendingMove {
  app: AdminTenderApplication;
  from: TenderApplicationStatus;
  to: TenderApplicationStatus;
  action: TenderStatusAction;
}

/** Copy for the "are you sure?" step on the one-click decisions that notify the bidder. */
const CONFIRM_COPY: Partial<
  Record<TenderStatusAction, { title: string; message: string; confirmLabel: string }>
> = {
  shortlist: {
    title: 'Shortlist this bid?',
    message: 'The bidder will be notified by SMS and email that their bid was shortlisted.',
    confirmLabel: 'Shortlist',
  },
  award: {
    title: 'Award the tender to this bidder?',
    message: 'The bidder will be notified by SMS and email, and this decision is final.',
    confirmLabel: 'Award tender',
  },
};

function emptyBoard(loading: boolean): BoardState {
  return TENDER_BOARD_COLUMNS.reduce((acc, col) => {
    acc[col.status] = { items: [], total: 0, loading, limit: COLUMN_PAGE_SIZE };
    return acc;
  }, {} as BoardState);
}

export interface TenderKanbanBoardProps {
  locale: string;
  /**
   * The board is always scoped to a single tender. Bids from different tenders
   * are not comparable — a shortlist only means something within one call — so
   * there is deliberately no all-tenders board.
   */
  tenderId: string;
  search: string;
  /** TENDER_EVALUATE — without it the board is read-only: no dragging, no move menu. */
  canEvaluate: boolean;
  /** Reports the summed column totals so the page header can show one number. */
  onTotalChange?: (total: number) => void;
}

/**
 * The tender pipeline as a board: one column per status, cards dragged between
 * them to move a bid along. Every drop routes through the same evaluation
 * actions the detail page uses, so the notifications, the status history and the
 * ordering rules are identical — the board is a faster way to drive the flow,
 * not a second one.
 *
 * Drag-and-drop is native HTML5 (as in `LessonsManager`), which touch devices do
 * not implement — so every card also carries a Move button that opens the same
 * transitions as a list. That is the accessible path too: the drag handle is not
 * keyboard-operable, the button is.
 */
export function TenderKanbanBoard({
  locale,
  tenderId,
  search,
  canEvaluate,
  onTotalChange,
}: TenderKanbanBoardProps) {
  const { success, error: toastError } = useToast();

  const [board, setBoard] = useState<BoardState>(() => emptyBoard(true));
  // Mirror for the rollback snapshot — reading state inside an async handler
  // would close over the value from the render that started the move.
  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const [drag, setDrag] = useState<{ id: string; from: TenderApplicationStatus } | null>(null);
  const [hoverColumn, setHoverColumn] = useState<TenderApplicationStatus | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // One pending move at a time, held while its modal collects what the backend needs.
  const [confirmMove, setConfirmMove] = useState<PendingMove | null>(null);
  const [rejectMove, setRejectMove] = useState<PendingMove | null>(null);
  const [moreInfoMove, setMoreInfoMove] = useState<PendingMove | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  /** Card whose Move picker is open — the touch/keyboard path into the same moves. */
  const [movePicker, setMovePicker] = useState<AdminTenderApplication | null>(null);

  // ── Loading ────────────────────────────────────────────────────────────────
  // Guards against a slow response for an old filter landing after a fast one
  // for the current filter and repopulating the board with stale cards.
  const requestRef = useRef(0);

  const loadBoard = useCallback(async () => {
    const token = ++requestRef.current;
    setBoard((prev) => {
      const next = { ...prev };
      for (const col of TENDER_BOARD_COLUMNS) next[col.status] = { ...next[col.status], loading: true };
      return next;
    });

    const entries = await Promise.all(
      TENDER_BOARD_COLUMNS.map(async (col): Promise<[TenderApplicationStatus, ColumnState]> => {
        try {
          const result = await tenderApplicationAdminApi.list({
            tenderId,
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
  }, [tenderId, search]);

  // Debounced so typing in the search box doesn't fire seven requests a keystroke.
  useEffect(() => {
    const timer = setTimeout(loadBoard, 300);
    return () => clearTimeout(timer);
  }, [loadBoard]);

  useEffect(() => {
    const total = TENDER_BOARD_COLUMNS.reduce((sum, col) => sum + board[col.status].total, 0);
    onTotalChange?.(total);
  }, [board, onTotalChange]);

  /**
   * Widens one column's window and re-reads it from the top. Re-sending the
   * cards already on screen costs little at these page sizes and buys an exact
   * column: the counts come back fresh and nothing is skipped or duplicated,
   * whatever has been moved in or out since the last read.
   */
  const loadMore = async (status: TenderApplicationStatus) => {
    const nextLimit = boardRef.current[status].limit + COLUMN_PAGE_SIZE;
    setBoard((prev) => ({ ...prev, [status]: { ...prev[status], loading: true } }));
    try {
      const result = await tenderApplicationAdminApi.list({
        tenderId,
        search: search || undefined,
        status,
        page: 1,
        limit: nextLimit,
      });
      setBoard((prev) => ({
        ...prev,
        [status]: {
          items: result.items,
          total: result.total,
          loading: false,
          limit: nextLimit,
        },
      }));
    } catch {
      setBoard((prev) => ({ ...prev, [status]: { ...prev[status], loading: false } }));
      toastError('Could not load more bids.');
    }
  };

  // ── Moving a card ──────────────────────────────────────────────────────────

  /** Lifts the card out of one column and drops it at the top of another. */
  const shiftCard = (
    state: BoardState,
    appId: string,
    from: TenderApplicationStatus,
    to: TenderApplicationStatus,
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
   * Sends the move and settles the card. `optimistic` is for the moves that go
   * through on the drop itself — the card jumps columns under the reviewer's
   * cursor and snaps back if the backend refuses. Moves that first collect
   * something in a modal wait for the response instead: there is nothing to
   * feel snappy about while a dialog is covering the board.
   *
   * Returns whether the move landed, so a form modal can stay open on failure
   * rather than throwing away what was typed into it.
   */
  const runMove = async (
    move: PendingMove,
    body: Parameters<typeof tenderApplicationAdminApi.updateStatus>[2] = {},
    { optimistic = false }: { optimistic?: boolean } = {},
  ): Promise<boolean> => {
    const { app, from, to, action } = move;
    // Exact snapshot, so a failure puts the card back where it was rather than
    // at the top of its old column.
    const before = boardRef.current;

    setBusyId(app.id);
    if (optimistic) setBoard((prev) => shiftCard(prev, app.id, from, to));

    try {
      const updated = await tenderApplicationAdminApi.updateStatus(app.id, action, body);
      setBoard((prev) => {
        const shifted = optimistic ? prev : shiftCard(prev, app.id, from, to);
        // Adopt the server's copy — it carries the review notes, the rejection
        // reason and the more-info scope the reviewer just wrote.
        return {
          ...shifted,
          [to]: {
            ...shifted[to],
            items: shifted[to].items.map((a) => (a.id === app.id ? { ...a, ...updated } : a)),
          },
        };
      });
      success(`${app.companyName} → ${STATUS_LABELS[to]}`);
      return true;
    } catch (err) {
      if (optimistic) setBoard(before); // a card left in the wrong column reads as done
      toastError(tenderApiError(err, 'Could not move that bid.'));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Entry point for both the drop and the Move picker. Decides whether the move
   * can go straight through or needs the reviewer to write something first.
   */
  const beginMove = (app: AdminTenderApplication, to: TenderApplicationStatus) => {
    const rule = tenderMoveRule(app.status, to);
    if (!rule.allowed) {
      toastError(rule.reason);
      return;
    }

    const move: PendingMove = { app, from: app.status, to, action: rule.action };
    switch (rule.action) {
      case 'request_more_info':
        setMoreInfoMove(move);
        break;
      case 'reject':
        setRejectReason('');
        setRejectMove(move);
        break;
      // Starting a review is the natural first step and takes no input — it
      // stays one gesture, as on the detail page, and moves the card instantly.
      case 'start_review':
        runMove(move, {}, { optimistic: true });
        break;
      default:
        setConfirmMove(move);
    }
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onCardDragStart = (e: React.DragEvent, app: AdminTenderApplication) => {
    setDrag({ id: app.id, from: app.status });
    e.dataTransfer.effectAllowed = 'move';
    // Firefox refuses to start a drag without payload on the transfer.
    e.dataTransfer.setData('text/plain', app.id);
  };

  const endDrag = () => {
    setDrag(null);
    setHoverColumn(null);
  };

  const onColumnDrop = (e: React.DragEvent, to: TenderApplicationStatus) => {
    e.preventDefault();
    const active = drag;
    endDrag();
    if (!active) return;
    const app = boardRef.current[active.from].items.find((a) => a.id === active.id);
    if (app) beginMove(app, to);
  };

  const totalLoaded = TENDER_BOARD_COLUMNS.reduce(
    (sum, col) => sum + board[col.status].items.length,
    0,
  );
  const anyLoading = TENDER_BOARD_COLUMNS.some((col) => board[col.status].loading);

  if (anyLoading && totalLoaded === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <>
      {/* The board owns the full height it is given and scrolls inside itself:
          the columns scroll vertically, the lane scrolls horizontally, and the
          page behind it never moves. */}
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto overflow-y-hidden pb-1">
        {TENDER_BOARD_COLUMNS.map((column) => (
          <BoardColumn
            key={column.status}
            column={column}
            state={board[column.status]}
            locale={locale}
            canEvaluate={canEvaluate}
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
            // Nothing was typed here, so it closes either way — the toast
            // carries the reason if the backend refused.
            await runMove(confirmMove);
            setConfirmMove(null);
          }}
          title={CONFIRM_COPY[confirmMove.action]!.title}
          message={`${confirmMove.app.companyName} — ${CONFIRM_COPY[confirmMove.action]!.message}`}
          confirmLabel={CONFIRM_COPY[confirmMove.action]!.confirmLabel}
          isLoading={busyId === confirmMove.app.id}
        />
      )}

      {/* Rejecting needs a reason the bidder will read, so it gets a form rather
          than a confirmation — the same rule the backend enforces. */}
      <Modal open={!!rejectMove} onClose={() => setRejectMove(null)} size="md">
        <ModalHeader>
          <ModalTitle>Reject this bid?</ModalTitle>
          {rejectMove && (
            <p className="mt-1 text-sm text-gray-500">
              {rejectMove.app.companyName} · {rejectMove.app.applicationNumber}
            </p>
          )}
        </ModalHeader>
        <ModalBody>
          <Textarea
            label="Reason for rejection"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            hint="Sent to the bidder by SMS and email. A rejected bid can no longer be actioned."
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
            Reject bid
          </Button>
        </ModalFooter>
      </Modal>

      <RequestMoreInfoModal
        open={!!moreInfoMove}
        sending={!!moreInfoMove && busyId === moreInfoMove.app.id}
        subtitle={
          moreInfoMove
            ? `${moreInfoMove.app.companyName} · ${moreInfoMove.app.applicationNumber}`
            : undefined
        }
        onClose={() => setMoreInfoMove(null)}
        onSend={async (payload: MoreInfoPayload) => {
          if (!moreInfoMove) return;
          const ok = await runMove(moreInfoMove, payload);
          if (ok) setMoreInfoMove(null); // on failure the note and ticks survive
        }}
      />
    </>
  );
}

// ── Column ───────────────────────────────────────────────────────────────────

function BoardColumn({
  column,
  state,
  locale,
  canEvaluate,
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
  column: TenderBoardColumn;
  state: ColumnState;
  locale: string;
  canEvaluate: boolean;
  drag: { id: string; from: TenderApplicationStatus } | null;
  isHovered: boolean;
  busyId: string | null;
  onDragStart: (e: React.DragEvent, app: AdminTenderApplication) => void;
  onDragEnd: () => void;
  onHover: (status: TenderApplicationStatus | null) => void;
  onDrop: (e: React.DragEvent, to: TenderApplicationStatus) => void;
  onOpenMovePicker: (app: AdminTenderApplication) => void;
  onLoadMore: () => void;
}) {
  const rule = drag ? tenderMoveRule(drag.from, column.status) : null;
  const acceptsDrop = rule?.allowed ?? false;
  // While a card is in the air, a column that would reject it is dimmed — the
  // reviewer sees where the bid can go before letting go of it.
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
        e.preventDefault(); // only a prevented dragover marks a valid drop target
        e.dataTransfer.dropEffect = 'move';
        if (!isHovered) onHover(column.status);
      }}
      onDrop={(e) => acceptsDrop && onDrop(e, column.status)}
    >
      <header className="shrink-0 border-b border-gray-200/70 px-3.5 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', column.dot)} />
          <h2 className="truncate text-[13px] font-bold text-gray-800">{column.label}</h2>
          {column.status === 'awarded' && (
            <Trophy className="h-3.5 w-3.5 shrink-0 text-green-600" />
          )}
          <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-500 ring-1 ring-gray-200">
            {state.total}
          </span>
        </div>
        <p className="mt-0.5 truncate pl-4 text-[11px] text-gray-400">{column.hint}</p>
      </header>

      {/* min-h-0 is what lets this scroll instead of stretching the column past
          the board — without it a tall list pushes the flex parent open. */}
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
              {acceptsDrop ? 'Drop a bid here' : 'Nothing here'}
            </p>
          </div>
        ) : (
          state.items.map((app) => (
            <BidCard
              key={app.id}
              app={app}
              locale={locale}
              canEvaluate={canEvaluate}
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

function BidCard({
  app,
  locale,
  canEvaluate,
  isDragging,
  isBusy,
  onDragStart,
  onDragEnd,
  onOpenMovePicker,
}: {
  app: AdminTenderApplication;
  locale: string;
  canEvaluate: boolean;
  isDragging: boolean;
  isBusy: boolean;
  onDragStart: (e: React.DragEvent, app: AdminTenderApplication) => void;
  onDragEnd: () => void;
  onOpenMovePicker: (app: AdminTenderApplication) => void;
}) {
  // A rejected or withdrawn bid is closed — the backend refuses every action on
  // it, so it does not get a grip or a move button.
  const movable = canEvaluate && !TERMINAL_STATUSES.includes(app.status);
  const verified = app.documents.filter((d) => d.verified).length;

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
            href={`/${locale}/admin/tenders/${app.id}`}
            className="font-mono text-[11px] font-semibold text-teal-600 hover:underline"
          >
            {app.applicationNumber}
          </Link>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{app.companyName}</p>
          <p className="truncate text-[11px] text-gray-400">TIN {app.companyTin}</p>
        </div>
        {isBusy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-teal-500" />}
      </div>

      {app.tender && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-gray-500">
          {resolveI18n(app.tender.titleI18n, app.tender.title, locale)}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-50 pt-2">
        <span className="truncate text-[11px] font-semibold text-gray-700">
          {app.bidAmount != null ? `${Number(app.bidAmount).toLocaleString()} RWF` : '—'}
        </span>
        <span className="flex shrink-0 items-center gap-2.5 text-[11px] text-gray-400">
          <span
            className={cn(
              'inline-flex items-center gap-1',
              app.documents.length > 0 && verified === app.documents.length && 'text-green-600',
            )}
            title={`${verified} of ${app.documents.length} documents verified`}
          >
            <FileCheck className="h-3 w-3" />
            {verified}/{app.documents.length}
          </span>
          {new Date(app.submittedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mt-2 flex gap-1.5">
        <Link
          href={`/${locale}/admin/tenders/${app.id}`}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-teal-400 hover:text-teal-600"
        >
          <Eye className="h-3 w-3" /> Open
        </Link>
        {movable && (
          <button
            type="button"
            onClick={() => onOpenMovePicker(app)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-teal-400 hover:text-teal-600"
            aria-label={`Move ${app.companyName} to another stage`}
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
 * way to move a bid on a touch device — HTML5 drag events never fire there — and
 * the only keyboard-operable one.
 */
function MovePickerModal({
  app,
  onClose,
  onPick,
}: {
  app: AdminTenderApplication | null;
  onClose: () => void;
  onPick: (to: TenderApplicationStatus) => void;
}) {
  return (
    <Modal open={!!app} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Move bid</ModalTitle>
        {app && (
          <p className="mt-1 text-sm text-gray-500">
            {app.companyName} · currently {STATUS_LABELS[app.status].toLowerCase()}
          </p>
        )}
      </ModalHeader>
      <ModalBody>
        <ul className="space-y-2">
          {app &&
            TENDER_BOARD_COLUMNS.filter((col) => col.status !== app.status).map((col) => {
              const rule = tenderMoveRule(app.status, col.status);
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
