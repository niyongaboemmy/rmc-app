// Dawah landing-page data layer. Two independent sources — the CMS (hero and
// description prose) and the live API (the featured course outline) — and
// NEITHER may take the page down.
//
// The fallback idiom is blogData.ts:30-57: wrap the fetch, swallow the throw,
// return the seed. A backend that is down, mid-deploy, or simply has an unset
// content section must still render a complete page with the seeded English
// copy — never a 500.

import {
  ContentKeys,
  getSiteContent,
  mergeContent,
  DAWAH_DEFAULT,
  type DawahContent,
} from '@/lib/content-api';
import { dawahApi, type DawahCourse } from '@/lib/dawahApi';

/** CMS copy for the landing page, merged over the seed. Never throws. */
export async function getDawahContent(): Promise<DawahContent> {
  try {
    const saved = await getSiteContent<DawahContent>(ContentKeys.dawah);
    // mergeContent, not a spread: a saved section whose rw/ar are still blank
    // would otherwise overwrite the seed's translations with empty strings.
    if (saved) return mergeContent(DAWAH_DEFAULT, saved);
  } catch {
    // Backend unreachable or section unset — fall back to the seeded defaults.
  }
  return DAWAH_DEFAULT;
}

/**
 * The featured courses behind the landing page's "outline of courses".
 *
 * Returns [] rather than throwing when the API is down. The section then
 * renders its empty state, which is the honest thing to show: we cannot say
 * there are no courses, only that we have none to show right now.
 */
export async function getFeaturedCourses(): Promise<DawahCourse[]> {
  try {
    return await dawahApi.courses.featured();
  } catch {
    // Backend unreachable — the section degrades to its empty state.
    return [];
  }
}
