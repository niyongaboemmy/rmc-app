/**
 * Client-side store for marriage applications.
 *
 * There is no backend endpoint yet, so submitted applications are persisted to
 * localStorage keyed by a generated application ID. The status page reads them
 * back so the "submit → get ID → check status" flow works end-to-end in the
 * browser. Swap these helpers for real API calls once the endpoint exists.
 */

export type CeremonyVenue = 'mosque' | 'outside';
export type PaymentMethod = 'momo' | 'bank' | 'cash';
export type ApplicationStatus = 'submitted' | 'review' | 'approved' | 'ready';

export interface MarriageApplication {
  id: string;
  groomName: string;
  brideName: string;
  groomNid: string;
  brideNid: string;
  witness1Nid: string;
  witness2Nid: string;
  officiant: string;
  province: string;
  district: string;
  venue: CeremonyVenue;
  payment: PaymentMethod;
  status: ApplicationStatus;
  submittedAt: string; // ISO timestamp
}

// Ordered status pipeline — used to render the progress tracker.
export const STATUS_FLOW: ApplicationStatus[] = ['submitted', 'review', 'approved', 'ready'];

const STORAGE_KEY = 'rmc.marriage.applications';

/** Generate a human-readable application ID, e.g. RMC-MR-LX9FA2K. */
export function generateApplicationId(): string {
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RMC-MR-${stamp}${rand}`;
}

function readAll(): Record<string, MarriageApplication> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveApplication(app: MarriageApplication): void {
  if (typeof window === 'undefined') return;
  const all = readAll();
  all[app.id] = app;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Look up an application by ID (case-insensitive, trimmed). */
export function getApplication(id: string): MarriageApplication | null {
  const key = id.trim().toUpperCase();
  if (!key) return null;
  return readAll()[key] ?? null;
}
