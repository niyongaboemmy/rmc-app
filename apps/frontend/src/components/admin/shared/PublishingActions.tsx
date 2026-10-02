'use client';

import { useId } from 'react';
import { Globe, Lock, Loader2, Pencil, Trash2 } from 'lucide-react';

/**
 * The row tools shared by everything an admin publishes for people to apply to —
 * job postings, scholarships and tenders. Each of those grew its own controls
 * (an eye toggle on jobs, labelled pills on scholarships, no publish or close on
 * tenders at all), so the same four actions looked and behaved differently from
 * page to page. One component keeps them in the same order, with the same words.
 *
 * Every record is in one of three states, whatever its storage looks like:
 * a draft nobody can see, open and taking applications, or closed.
 */
export type PublishState = 'draft' | 'open' | 'closed';
export type PublishAction = 'publish' | 'close' | 'delete';

/**
 * A hover/focus label for an icon-only tool. Visual unless given an `id` — the
 * wrapped control still needs its own aria-label, or an `aria-describedby`
 * pointing at that id when the tip carries information the label does not (why a
 * button is disabled). `side="start"` sits it beside the control for rows inside
 * a scrolling modal, where above or below would be clipped.
 */
export function Tip({ label, side = 'top', id, children }: { label: string; side?: 'top' | 'start'; id?: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 ${
          side === 'top'
            ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'
            : 'end-full top-1/2 me-1.5 -translate-y-1/2'
        }`}
      >
        {label}
      </span>
    </span>
  );
}

const STATE_BADGE: Record<PublishState, { cls: string; label: string }> = {
  draft: { cls: 'bg-amber-100 text-amber-700', label: 'Draft' },
  open: { cls: 'bg-green-100 text-green-700', label: 'Open' },
  closed: { cls: 'bg-gray-100 text-gray-500', label: 'Closed' },
};

/** The state pill, so "Open" is the same green on every page. */
export function PublishStateBadge({ state, className = '' }: { state: PublishState; className?: string }) {
  const s = STATE_BADGE[state];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls} ${className}`}>
      {s.label}
    </span>
  );
}

export const iconToolClass =
  'w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 transition-colors';

/**
 * Publish/Reopen · Close · Edit · Delete, always in that order.
 *
 * BOTH state changes are always rendered, the inapplicable one disabled, rather
 * than showing only the one that applies: rendering conditionally meant a page
 * where everything happened to be open showed no Publish button at all, and the
 * controls shifted position between rows so the column could not be scanned.
 *
 * Disabled is a grey palette, never opacity — a coloured pill dimmed to 40% puts
 * its label well under readable contrast.
 *
 * `children` renders first, for tools only one page has (review board, public page).
 */
export function PublishingActions({
  state,
  busy = false,
  noun,
  submissions = 'applications',
  onAction,
  onEdit,
  children,
}: {
  state: PublishState;
  busy?: boolean;
  /** "scholarship", "job posting", "tender" — used in the tooltips. */
  noun: string;
  /** What people send in: "applications", "bids". */
  submissions?: string;
  onAction: (action: PublishAction) => void;
  onEdit: () => void;
  children?: React.ReactNode;
}) {
  // The pills' tips say WHY one is disabled, so they are wired to the button as
  // its description — otherwise the reason exists only for a mouse.
  const publishTipId = useId();
  const closeTipId = useId();
  const publishTip =
    state === 'open'
      ? 'Already open'
      : state === 'closed'
        ? `Start accepting ${submissions} again`
        : `Make this ${noun} visible and open for ${submissions}`;
  const closeTip =
    state === 'closed'
      ? 'Already closed'
      : state === 'draft'
        ? 'Publish it before you can close it'
        : `Stop accepting new ${submissions}`;

  return (
    <div className="inline-flex items-center gap-1.5 justify-end">
      {children}
      <Tip label={publishTip} id={publishTipId}>
        <button
          type="button"
          aria-describedby={publishTipId}
          onClick={() => onAction('publish')}
          disabled={busy || state === 'open'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rmc-green/25 bg-rmc-green-light/60 px-2.5 h-8 text-xs font-semibold text-rmc-green transition-colors enabled:hover:bg-rmc-green enabled:hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
        >
          {busy && state !== 'open' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
          {state === 'closed' ? 'Reopen' : 'Publish'}
        </button>
      </Tip>
      <Tip label={closeTip} id={closeTipId}>
        <button
          type="button"
          aria-describedby={closeTipId}
          onClick={() => onAction('close')}
          disabled={busy || state !== 'open'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 h-8 text-xs font-semibold text-amber-700 transition-colors enabled:hover:bg-amber-500 enabled:hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
        >
          {busy && state === 'open' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
          Close
        </button>
      </Tip>
      <Tip label={`Edit ${noun}`}>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${noun}`}
          className={`${iconToolClass} hover:text-rmc-green hover:border-rmc-green`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      </Tip>
      <Tip label={`Delete ${noun}`}>
        <button
          type="button"
          onClick={() => onAction('delete')}
          disabled={busy}
          aria-label={`Delete ${noun}`}
          className={`${iconToolClass} hover:text-red-600 hover:border-red-300 disabled:opacity-50`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </Tip>
    </div>
  );
}

/**
 * Wording for the confirmation of each action, so all three pages ask the same
 * question the same way. `reopen` is not a fourth action — it is `publish` on a
 * closed record, the same call and a different thing to the person reading it.
 */
export function publishingConfirmCopy({
  action,
  state,
  title,
  noun,
  submissions = 'applications',
  deleteNote,
}: {
  action: PublishAction;
  state: PublishState;
  title: string;
  noun: string;
  submissions?: string;
  deleteNote?: string;
}) {
  const q = `"${title}"`;
  if (action === 'delete') {
    return {
      title: `Delete this ${noun}?`,
      message: `${q} will be permanently removed. This cannot be undone.${deleteNote ? ` ${deleteNote}` : ''}`,
      confirmLabel: 'Delete',
      variant: 'danger' as const,
    };
  }
  if (action === 'close') {
    return {
      title: `Close this ${noun}?`,
      message: `${q} will stop accepting new ${submissions}. Those already submitted continue through review, and you can reopen it later.`,
      confirmLabel: 'Close it',
      variant: 'default' as const,
    };
  }
  return state === 'closed'
    ? {
        title: `Reopen this ${noun}?`,
        message: `${q} starts accepting ${submissions} again straight away.`,
        confirmLabel: 'Reopen',
        variant: 'default' as const,
      }
    : {
        title: `Publish this ${noun}?`,
        message: `${q} becomes visible to the public and open for ${submissions} immediately.`,
        confirmLabel: 'Publish',
        variant: 'default' as const,
      };
}

/** The API's own refusal ("cannot publish without: deadline") beats a generic failure. */
export function serverMessage(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { error?: { message?: string | string[] } } } })?.response?.data?.error?.message;
  return Array.isArray(m) ? m.join(', ') : m ?? fallback;
}
