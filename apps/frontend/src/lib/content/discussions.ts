import { Tri, tri } from './client';

/**
 * Community Discussions listing copy, admin-editable in place.
 *
 * As with `courses.ts`/`library.ts`, this holds ONLY the prose chrome around the
 * list — the header, the two empty-states (unfiltered vs filtered) and the error
 * state. The questions themselves are member-authored posts with their own table
 * and moderation; they are never CMS copy. Structural labels that are UI grammar
 * rather than editorial voice (filter placeholders, sort tabs, the "Ask" button,
 * per-card counts) stay in the i18n messages and are NOT surfaced here.
 *
 * Seeds are lifted verbatim from `dawah.discussions.*` in messages/{en,rw,ar}.json,
 * so switching the page from `t()` to this store is a no-op for every visitor
 * until an admin edits something.
 */
export interface DiscussionsContent {
  header: {
    title: Tri;
    subtitle: Tri;
  };
  /** Shown when the list is empty with no filters applied. */
  empty: {
    body: Tri;
  };
  /** Shown when filters are applied but nothing matches. */
  emptyFiltered: {
    body: Tri;
  };
  error: {
    body: Tri;
  };
}

export const DISCUSSIONS_DEFAULT: DiscussionsContent = {
  header: {
    title: tri('Discussions', 'Ibiganiro', 'النقاشات'),
    subtitle: tri(
      'Ask the community, and read what RMC scholars have answered.',
      'Baza umuryango, kandi usome ibyo inzobere za RMC zasubije.',
      'اسأل المجتمع، واقرأ إجابات علماء المجتمع الرواندي المسلم.',
    ),
  },
  empty: {
    body: tri('No questions here yet.', 'Nta bibazo birahaba.', 'لا توجد أسئلة هنا بعد.'),
  },
  emptyFiltered: {
    body: tri(
      'No questions match these filters.',
      "Nta kibazo gihuye n'aya matonde.",
      'لا توجد أسئلة تطابق هذه الفلاتر.',
    ),
  },
  error: {
    body: tri(
      "We couldn't load the discussions. Please try again.",
      'Ntitwashoboye gutangiza ibiganiro. Ongera ugerageze.',
      'تعذّر تحميل النقاشات. حاول مرة أخرى.',
    ),
  },
};
