import { Tri, tri } from './client';

export type BadgeTone = 'green' | 'gold' | 'neutral';

/** A past activity (with photo gallery + impact figures). */
export interface ActivityItem {
  category: Tri;
  tone: BadgeTone;
  title: Tri;
  excerpt: Tri;
  /** Human-readable date, e.g. "June 4, 2026". */
  date: string;
  image: string;
  gallery: string[];
  peopleHelped: number;
  budgetUsed: number;
}

/** An upcoming event (with fundraising progress). */
export interface EventItem {
  title: Tri;
  /** ISO date "YYYY-MM-DD". */
  date: string;
  time: string;
  location: string;
  type: Tri;
  tone: BadgeTone;
  goalAmount: number;
  raisedAmount: number;
}

export interface ActivitiesContent {
  eyebrow: Tri;
  title: Tri;
  lede: Tri;
  activitiesHeading: Tri;
  eventsHeading: Tri;
  activities: ActivityItem[];
  events: EventItem[];
}

/**
 * Section copy only — the activities/events lists ship EMPTY. Real activities
 * and events are managed in Admin → Content → Activities & Events and read from
 * the site-content store; no demo/hardcoded items are baked into the app. Both
 * the home preview and the /activities page render their empty states until an
 * admin adds real content.
 */
export const ACTIVITIES_DEFAULT: ActivitiesContent = {
  eyebrow: tri('Activities & Events', 'Ibikorwa n’Ibirori', 'الأنشطة والفعاليات'),
  title: tri('Latest & Upcoming', 'Ibiheruka n’Ibizaza', 'الأحدث والقادم'),
  lede: tri(
    "Follow RMC's most recent activities and mark your calendar for the community events ahead.",
    "Kurikira ibikorwa biheruka bya RMC kandi wandike mu kalendari yawe ibirori by'umuryango bizaza.",
    'تابع أحدث أنشطة المجتمع الإسلامي الرواندي وسجّل في مفكرتك الفعاليات المجتمعية القادمة.',
  ),
  activitiesHeading: tri('Latest Activities', 'Ibikorwa Biheruka', 'أحدث الأنشطة'),
  eventsHeading: tri('Upcoming Events', 'Ibirori Bizaza', 'الفعاليات القادمة'),
  activities: [],
  events: [],
};
