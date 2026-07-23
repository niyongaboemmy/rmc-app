import { Tri, tri } from './client';

/**
 * Courses catalogue copy, admin-editable in place (and mirrored nowhere else).
 *
 * As with `library.ts`, this holds ONLY the prose chrome around the grid — the
 * header, the empty-state and the error-state. The courses themselves are real
 * records with their own table, slugs and admin CRUD; they are never CMS copy.
 * Structural labels that are part of the UI grammar rather than editorial voice
 * (filter placeholders, level/format/language names, pagination, the error's
 * "Retry" button) stay in the i18n messages and are NOT surfaced here.
 *
 * Seeds are lifted verbatim from `dawah.courses.*` in messages/{en,rw,ar}.json,
 * so switching the page from `t()` to this store is a no-op for every visitor
 * until an admin edits something. Kinyarwanda inherits English where the message
 * catalogue itself had no translation yet — `pick()` already does that fallback,
 * so leaving `rw` empty here reproduces the current page exactly.
 */
export interface CoursesContent {
  header: {
    title: Tri;
    subtitle: Tri;
  };
  empty: {
    title: Tri;
    body: Tri;
  };
  error: {
    title: Tri;
    body: Tri;
  };
}

export const COURSES_DEFAULT: CoursesContent = {
  header: {
    title: tri('Courses', 'Amasomo', 'الدورات'),
    subtitle: tri(
      'Structured lessons you can follow at your own pace.',
      'Amasomo ateguwe neza ushobora gukurikira ku muvuduko wawe.',
      'دروس منظّمة تتابعها وفق وتيرتك الخاصة.',
    ),
  },
  empty: {
    title: tri('No courses found', '', 'لا توجد دورات'),
    body: tri(
      'Try clearing your filters or searching for something else.',
      '',
      'جرّب إزالة عوامل التصفية أو البحث عن شيء آخر.',
    ),
  },
  error: {
    title: tri('Could not load courses', '', 'تعذّر تحميل الدورات'),
    body: tri(
      'Something went wrong. Please try again.',
      '',
      'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    ),
  },
};
