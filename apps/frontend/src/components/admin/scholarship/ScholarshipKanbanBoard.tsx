'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, GripVertical, Loader2, MoveRight, Phone, School } from 'lucide-react';
import {
  ConfirmModal,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { scholarshipAdminApi } from '@/lib/scholarshipAdminApi';
import type { ScholarshipApplication, ScholarshipApplicationStatus } from '@/lib/scholarshipApi';
import {
  SCHOLARSHIP_BOARD_COLUMNS,
  STATUS_LABELS,
  UNDROPPABLE_STATUSES,
  scholarshipApiError,
  scholarshipMoveRule,
} from '@/lib/scholarshipWorkflow';

type BoardState = Record<ScholarshipApplicationStatus, ScholarshipApplication[]>;

interface PendingMove {
  application: ScholarshipApplication;
  from: ScholarshipApplicationStatus;
  to: ScholarshipApplicationStatus;
}

const emptyBoard = (): BoardState =>
  SCHOLARSHIP_BOARD_COLUMNS.reduce((acc, c) => ({ ...acc, [c.status]: [] }), {} as BoardState);

interface Props {
  locale: string;
  /** Board is always scoped to ONE scholarship — a mixed board compares applicants
   *  competing for different awards, which is not a decision anyone makes. */
  programId: string;
  canApprove: boolean;
  onTotalChange?: (total: number) => void;
}

/**
 * The scholarship review pipeline as a board: one column per status, cards
 * dragged between them to move an application along.
 *
 * Every drop routes through the SAME `updateStatus` action the detail page uses,
 * so the status history and the ordering rules are identical — the board is a
 * faster way to drive the flow, not a second one.
 *
 * Drag-and-drop is native HTML5, which touch devices do not implement, so every
 * card also carries a Move button opening the same transitions as a list. That
 * is the accessible path too: a drag handle is not keyboard-operable, a button
 * is. Same reasoning as TenderKanbanBoard.
 */
export function ScholarshipKanbanBoard({ locale, programId, canApprove, onTotalChange }: Props) {
  const { success, error: toastError } = useToast();

  const [board, setBoard] = useState<BoardState>(emptyBoard);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState<{ id: string; from: ScholarshipApplicationStatus } | null>(null);
  const [hoverColumn, setHoverColumn] = useState<ScholarshipApplicationStatus | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [confirmMove, setConfirmMove] = useState<PendingMove | null>(null);
  const [rejectMove, setRejectMove] = useState<PendingMove | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [movePicker, setMovePicker] = useState<ScholarshipApplication | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // One page big enough to hold a whole call. The board is a pipeline view;
      // paginating it would hide the very cards a reviewer is looking for.
      const result = await scholarshipAdminApi.list({ programId, page: 1, limit: 200 });
      const next = emptyBoard();
      for (const app of result.items) {
        (next[app.status] ??= []).push(app);
      }
      setBoard(next);
    } catch (err) {
      toastError(scholarshipApiError(err, 'Could not load the board.'));
    } finally {
      setLoading(false);
    }
  }, [programId, toastError]);

  useEffect(() => { void load(); }, [load]);

  const total = useMemo(
    () => Object.values(board).reduce((n, list) => n + list.length, 0),
    [board],
  );
  useEffect(() => { onTotalChange?.(total); }, [total, onTotalChange]);

  /** Applies a move through the API, then reloads so the board matches the server. */
  const commit = async (move: PendingMove, reason?: string) => {
    const rule = scholarshipMoveRule(move.from, move.to);
    if (!rule.allowed) { toastError(rule.reason); return; }

    setBusyId(move.application.id);
    try {
      await scholarshipAdminApi.updateStatus(move.application.id, {
        action: rule.action,
        ...(reason ? { reason } : {}),
      });
      success(`Moved to ${STATUS_LABELS[move.to]}.`);
      await load();
    } catch (err) {
      // Reload regardless: the optimistic column may be wrong now.
      toastError(scholarshipApiError(err, 'That move was refused.'));
      await load();
    } finally {
      setBusyId(null);
      setConfirmMove(null);
      setRejectMove(null);
      setRejectReason('');
      setMovePicker(null);
    }
  };

  /** Routes a requested move to the right confirmation surface. */
  const requestMove = (application: ScholarshipApplication, to: ScholarshipApplicationStatus) => {
    const from = application.status;
    const rule = scholarshipMoveRule(from, to);
    if (!rule.allowed) { toastError(rule.reason); return; }

    // Rejecting needs a reason the applicant will read, so it gets a form
    // rather than a yes/no. The backend requires it too.
    if (to === 'rejected') setRejectMove({ application, from, to });
    else setConfirmMove({ application, from, to });
  };

  const onColumnDrop = (to: ScholarshipApplicationStatus) => {
    setHoverColumn(null);
    if (!drag) return;
    const application = board[drag.from]?.find((a) => a.id === drag.id);
    setDrag(null);
    if (application) requestMove(application, to);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-24">
        <Loader2 className="h-6 w-6 animate-spin text-rmc-green" />
      </div>
    );
  }

  return (
    <>
      {/* Horizontal scroll rather than wrapping: a pipeline read top-to-bottom
          in two rows stops being a pipeline. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-4">
          {SCHOLARSHIP_BOARD_COLUMNS.map((col) => {
            const cards = board[col.status] ?? [];
            const droppable =
              canApprove && !!drag && !UNDROPPABLE_STATUSES.includes(col.status) &&
              scholarshipMoveRule(drag.from, col.status).allowed;

            return (
              <section
                key={col.status}
                onDragOver={(e) => {
                  if (!droppable) return;
                  e.preventDefault();
                  setHoverColumn(col.status);
                }}
                onDragLeave={() => setHoverColumn((c) => (c === col.status ? null : c))}
                onDrop={(e) => { e.preventDefault(); onColumnDrop(col.status); }}
                className={cn(
                  'w-72 shrink-0 rounded-2xl border border-gray-100 bg-gray-50/60 p-3 transition-colors',
                  droppable && 'ring-2 ring-dashed',
                  hoverColumn === col.status && droppable && col.dropRing,
                )}
              >
                <header className="mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', col.dot)} />
                    <h3 className="text-sm font-bold text-gray-900">{col.label}</h3>
                    <span className="ms-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500">
                      {cards.length}
                    </span>
                  </div>
                  <p className="mt-0.5 ps-4 text-[11px] leading-snug text-gray-400">{col.hint}</p>
                </header>

                <div className="space-y-2">
                  {cards.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-300">
                      Nothing here
                    </p>
                  )}
                  {cards.map((app) => (
                    <article
                      key={app.id}
                      draggable={canApprove}
                      onDragStart={() => setDrag({ id: app.id, from: app.status })}
                      onDragEnd={() => { setDrag(null); setHoverColumn(null); }}
                      className={cn(
                        'group rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow',
                        canApprove && 'cursor-grab active:cursor-grabbing hover:shadow-md',
                        busyId === app.id && 'opacity-50',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {canApprove && (
                          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-gray-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/${locale}/admin/scholarship/${app.id}`}
                            className="block truncate text-sm font-semibold text-gray-900 hover:text-rmc-green"
                          >
                            {app.fullNames}
                          </Link>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
                            {app.applicationNumber}
                          </p>
                          <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-500">
                            <p className="flex items-center gap-1.5 truncate">
                              <School className="h-3 w-3 shrink-0" /> {app.schoolName}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 shrink-0" /> {app.phone}
                            </p>
                          </div>
                        </div>
                      </div>

                      {canApprove && (
                        <button
                          type="button"
                          onClick={() => setMovePicker(app)}
                          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-[11px] font-semibold text-gray-500 transition-colors hover:border-rmc-green hover:text-rmc-green"
                        >
                          <MoveRight className="h-3 w-3" /> Move
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* The keyboard and touch path to the same transitions as dragging. */}
      <Modal open={!!movePicker} onClose={() => setMovePicker(null)} size="sm">
        <ModalHeader>
          <ModalTitle>Move {movePicker?.fullNames}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-1.5">
            {SCHOLARSHIP_BOARD_COLUMNS.map((col) => {
              if (!movePicker) return null;
              const rule = scholarshipMoveRule(movePicker.status, col.status);
              if (!rule.allowed) return null;
              return (
                <button
                  key={col.status}
                  type="button"
                  onClick={() => requestMove(movePicker, col.status)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm transition-colors hover:border-rmc-green hover:bg-rmc-green-light/40"
                >
                  <span className={cn('h-2 w-2 rounded-full', col.dot)} />
                  <span className="font-medium text-gray-800">{col.label}</span>
                  <ArrowRight className="ms-auto h-3.5 w-3.5 text-gray-300" />
                </button>
              );
            })}
            {/* Only reachable when nothing is legal — say so rather than show an
                empty modal. */}
            {movePicker &&
              SCHOLARSHIP_BOARD_COLUMNS.every(
                (c) => !scholarshipMoveRule(movePicker.status, c.status).allowed,
              ) && (
                <p className="py-4 text-center text-sm text-gray-400">
                  Nothing further can be done with a{' '}
                  {STATUS_LABELS[movePicker.status].toLowerCase()} application.
                </p>
              )}
          </div>
        </ModalBody>
      </Modal>

      <ConfirmModal
        open={!!confirmMove}
        title={confirmMove ? `Move to ${STATUS_LABELS[confirmMove.to]}?` : ''}
        message={
          confirmMove
            ? `${confirmMove.application.fullNames} will move from ${STATUS_LABELS[confirmMove.from]} to ${STATUS_LABELS[confirmMove.to]}.`
            : ''
        }
        confirmLabel="Move"
        isLoading={!!confirmMove && busyId === confirmMove.application.id}
        onConfirm={() => { if (confirmMove) void commit(confirmMove); }}
        onClose={() => setConfirmMove(null)}
      />

      {/* Rejecting needs a reason the applicant will read, so it is a form. */}
      <Modal open={!!rejectMove} onClose={() => setRejectMove(null)} size="md">
        <ModalHeader>
          <ModalTitle>Reject {rejectMove?.application.fullNames}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why is this application being declined?"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Recorded on the application and shown to the applicant.
          </p>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setRejectMove(null)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!rejectReason.trim() || busyId === rejectMove?.application.id}
            onClick={() => rejectMove && void commit(rejectMove, rejectReason.trim())}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {busyId === rejectMove?.application.id && <Loader2 className="h-4 w-4 animate-spin" />}
            Reject
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
