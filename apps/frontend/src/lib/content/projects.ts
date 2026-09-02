import { Tri, tri } from './client';

export type ProjectStatus = 'ongoing' | 'completed';

/** One capital project (construction, mosque, facility, …) with a funding goal. */
export interface ProjectItem {
  /** URL path segment, e.g. "kigali-central-mosque". */
  slug: string;
  title: Tri;
  /** Short blurb shown on the project card. */
  summary: Tri;
  /** Full description shown on the detail page (plain text; blank lines = paragraphs). */
  description: Tri;
  /** "What we need" — how the funds will be used (plain text). */
  whatWeNeed?: Tri;
  /** Free label, e.g. "Mosque", "Construction", "Facility". */
  category: string;
  location?: string;
  /** Currency for the funding figures (default RWF). */
  currency: string;
  /** Total funds needed to complete the project. */
  fundNeeded: number;
  /** Funds collected so far (admin-maintained). */
  fundCollected: number;
  status: ProjectStatus;
  /** File-server key (or URL) for the cover image. */
  imageKey?: string;
  /** File-server keys for additional images shown on the detail page. */
  galleryImages?: string[];
  /**
   * The donation campaign this project raises for, by slug.
   *
   * Optional: a project can exist without one — it is being described, not
   * collected for. When set, the project page's call to action points at that
   * campaign on the donate page instead of the general donate landing, so a
   * reader who has just read why the money is needed gives to THAT rather than
   * having to find it again in a list.
   *
   * A slug, not an id, matching how the donate cart already identifies a campaign
   * (`campaignSlug` on CreateDonationPayload). An id would be one more thing to
   * translate between two systems that already agree on slugs.
   */
  campaignSlug?: string;
}

export interface ProjectsContent {
  eyebrow: Tri;
  title: Tri;
  lede: Tri;
  items: ProjectItem[];
}

/** Common project categories offered in the admin picker (admins may type their own). */
export const PROJECT_CATEGORIES = [
  'Mosque',
  'Construction',
  'Facility',
  'School',
  'Water & Sanitation',
  'Renovation',
  'Other',
];

/**
 * Section copy only — the project list ships EMPTY. Every project is created by
 * an admin from Admin → Projects and stored in the site-content store; no
 * hardcoded/demo projects are baked into the app.
 */
export const PROJECTS_DEFAULT: ProjectsContent = {
  eyebrow: tri('Our Projects', 'Imishinga Yacu', 'مشاريعنا'),
  title: tri('Ongoing Projects', 'Imishinga Iri Gukorwa', 'المشاريع الجارية'),
  lede: tri(
    'Help us build the future of our community — mosques, schools and facilities that serve the Muslims of Rwanda. Every contribution brings a project closer to completion.',
    "Dufashe kubaka ejo hazaza h'umuryango wacu — imisigiti, amashuri n'ibikorwa remezo bikorera Abayisilamu bo mu Rwanda. Buri nkunga yegereza umushinga kurangira.",
    'ساعدونا في بناء مستقبل مجتمعنا — مساجد ومدارس ومرافق تخدم مسلمي رواندا. كل مساهمة تقرّب المشروع من الاكتمال.',
  ),
  items: [],
};

/** Funded percentage, clamped to 0–100. */
export function projectPct(collected: number, needed: number): number {
  if (!needed || needed <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((collected / needed) * 100)));
}

/** Amount with currency, thousands-separated, e.g. "RWF 30,000,000". */
export function projectMoney(currency: string, amount: number): string {
  const n = Number(amount || 0).toLocaleString('en-US');
  return !currency || currency === 'RWF' ? `RWF ${n}` : `${currency} ${n}`;
}

/** Compact amount for tight spaces, e.g. "RWF 30M", "RWF 8.5M", "RWF 850K". */
export function projectMoneyShort(currency: string, amount: number): string {
  const cur = !currency || currency === 'RWF' ? 'RWF' : currency;
  const n = Number(amount || 0);
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${cur} ${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${cur} ${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return `${cur} ${n.toLocaleString('en-US')}`;
}
