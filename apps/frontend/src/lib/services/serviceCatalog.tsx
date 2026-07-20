import type { FC } from 'react';

/**
 * The single source of truth for the public Services landing page.
 *
 * Each service is a clickable element on the landing list. A service with a
 * `modal` block opens the concise ServiceModal (summary + requirements + steps +
 * notes + actions); one without simply links to its full detail page. This lets
 * us roll the modal pattern out one service at a time — marriage is the pilot;
 * the rest keep their current link-to-detail behaviour until they get a `modal`.
 *
 * Per-service variance (apply vs register vs report, status present or not) lives
 * entirely in `actions`, so the modal renders generically with no per-service
 * branching. `detailHref`/action `href` are locale-less; the caller prefixes.
 */

type IconType = FC<{ className?: string }>;

// ── Stroke-only 24×24 icons (respond to currentColor) ───────────────────────────
function MarriageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      <circle cx="9" cy="12" r="4" />
      <circle cx="15" cy="12" r="4" />
    </svg>
  );
}
function FuneralIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      <circle cx="16.5" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="8" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="3.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ConductIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function ScholarshipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      <line x1="22" y1="10" x2="22" y2="16" />
      <circle cx="22" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function HajjIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l8 4v11l-8 4-8-4v-11z" />
      <path d="M4 8.5l8 4 8-4" />
      <path d="M4 8.2h16" />
      <path d="M12 12.5V21" />
    </svg>
  );
}
function TenderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="12" y2="13" />
      <line x1="8" y1="17" x2="11" y2="17" />
      <circle cx="16" cy="17" r="3" />
      <path d="M14.8 17l.9.9 1.5-1.5" />
    </svg>
  );
}
function JobsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="17" rx="1" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="8" y1="10" x2="8" y2="21" />
      <line x1="16" y1="10" x2="16" y2="21" />
      <rect x="5" y="6" width="2" height="2" rx="0.3" />
      <rect x="11" y="6" width="2" height="2" rx="0.3" />
      <rect x="17" y="6" width="2" height="2" rx="0.3" />
    </svg>
  );
}

export type AccentKey = 'rose' | 'slate' | 'indigo' | 'violet' | 'amber' | 'teal' | 'emerald';

/**
 * Accent classes, spelled out fully so Tailwind's JIT keeps them. `soft`/`text`
 * tint the icon chip; `hoverBorder` lights the row on hover; `btn` is the primary
 * action button.
 */
export const ACCENTS: Record<AccentKey, { soft: string; text: string; hoverBorder: string; btn: string }> = {
  rose:    { soft: 'bg-rose-50',    text: 'text-rose-600',    hoverBorder: 'hover:border-rose-200',    btn: 'bg-rose-600 hover:bg-rose-700' },
  slate:   { soft: 'bg-slate-100',  text: 'text-slate-600',   hoverBorder: 'hover:border-slate-300',   btn: 'bg-slate-600 hover:bg-slate-700' },
  indigo:  { soft: 'bg-indigo-50',  text: 'text-indigo-600',  hoverBorder: 'hover:border-indigo-200',  btn: 'bg-indigo-600 hover:bg-indigo-700' },
  violet:  { soft: 'bg-violet-50',  text: 'text-violet-600',  hoverBorder: 'hover:border-violet-200',  btn: 'bg-violet-600 hover:bg-violet-700' },
  amber:   { soft: 'bg-amber-50',   text: 'text-amber-600',   hoverBorder: 'hover:border-amber-200',   btn: 'bg-amber-600 hover:bg-amber-700' },
  teal:    { soft: 'bg-teal-50',    text: 'text-teal-600',    hoverBorder: 'hover:border-teal-200',    btn: 'bg-teal-600 hover:bg-teal-700' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-600', hoverBorder: 'hover:border-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700' },
};

export interface ServiceAction {
  /** 'apply' is the primary CTA; 'status'/'link' are secondary. */
  kind: 'apply' | 'status' | 'link';
  /** i18n key (under the `services` namespace) for the button label. */
  labelKey: string;
  /** Locale-less route; the caller prefixes `/${locale}`. */
  href: string;
}

export interface ServiceDef {
  /** i18n key under `services.*` for title/desc, and `services.{key}.modal.*`. */
  key: string;
  Icon: IconType;
  accent: AccentKey;
  /** Full detail page (locale-less). Linked from the modal and used as the card
   *  target for services that don't yet have a modal. */
  detailHref: string;
  /** Present → the card opens the concise modal. Absent → the card links to detailHref. */
  modal?: { requirements: number; steps: number; notes: boolean };
  /** Modal action buttons. Ignored when `modal` is absent. */
  actions?: ServiceAction[];
}

export const SERVICES: ServiceDef[] = [
  {
    key: 'marriage', Icon: MarriageIcon, accent: 'rose',
    detailHref: '/services/marriage',
    modal: { requirements: 6, steps: 7, notes: true },
    actions: [
      { kind: 'apply',  labelKey: 'explore.apply',  href: '/services/marriage/apply' },
      { kind: 'status', labelKey: 'explore.status', href: '/services/marriage/status' },
    ],
  },
  {
    key: 'funeral', Icon: FuneralIcon, accent: 'slate',
    detailHref: '/services/funeral',
    modal: { requirements: 6, steps: 6, notes: true },
    actions: [
      { kind: 'apply', labelKey: 'explore.report',      href: '/services/funeral/request' },
      { kind: 'link',  labelKey: 'explore.cemeteries',  href: '/services/funeral/cemeteries' },
    ],
  },
  {
    key: 'conduct', Icon: ConductIcon, accent: 'indigo',
    detailHref: '/services/good-conduct',
    modal: { requirements: 6, steps: 6, notes: true },
    actions: [
      { kind: 'apply',  labelKey: 'explore.apply',  href: '/services/good-conduct/apply' },
      { kind: 'status', labelKey: 'explore.status', href: '/services/good-conduct/status' },
    ],
  },
  {
    key: 'scholarship', Icon: ScholarshipIcon, accent: 'violet',
    detailHref: '/services/scholarship',
    modal: { requirements: 5, steps: 4, notes: true },
    actions: [
      { kind: 'apply',  labelKey: 'explore.apply',  href: '/services/scholarship/apply' },
      { kind: 'status', labelKey: 'explore.status', href: '/services/scholarship/status' },
    ],
  },
  {
    key: 'hajj', Icon: HajjIcon, accent: 'amber',
    detailHref: '/services/hajj',
    modal: { requirements: 6, steps: 5, notes: true },
    actions: [
      { kind: 'apply',  labelKey: 'explore.register', href: '/services/hajj/register' },
      { kind: 'status', labelKey: 'explore.status',   href: '/services/hajj/status' },
    ],
  },
  {
    key: 'tender', Icon: TenderIcon, accent: 'teal',
    detailHref: '/services/tender',
    modal: { requirements: 5, steps: 4, notes: true },
    actions: [
      { kind: 'apply',  labelKey: 'explore.apply',  href: '/services/tender/apply' },
      { kind: 'status', labelKey: 'explore.status', href: '/services/tender/status' },
    ],
  },
  {
    key: 'jobs', Icon: JobsIcon, accent: 'emerald',
    detailHref: '/services/jobs',
    modal: { requirements: 6, steps: 5, notes: true },
    actions: [
      { kind: 'apply',  labelKey: 'explore.apply',  href: '/services/jobs/apply' },
      { kind: 'status', labelKey: 'explore.status', href: '/services/jobs/status' },
    ],
  },
];
