import { Tri, tri } from './client';

/**
 * Library page copy, admin-editable in place (and mirrored nowhere else).
 *
 * This holds ONLY the prose chrome around the shelf — the header, the
 * empty-state and the error-state. The books themselves are real records with
 * their own table, slugs and admin CRUD; they are never CMS copy. Structural
 * labels that are part of the UI grammar rather than editorial voice (filter
 * placeholders, language names, pagination) stay in the i18n messages and are
 * NOT surfaced here.
 *
 * Seeds are lifted verbatim from `dawah.library.*` in messages/{en,rw,ar}.json,
 * so switching the page from `t()` to this store is a no-op for every visitor
 * until an admin edits something. Kinyarwanda inherits English where the message
 * catalogue itself had no translation yet — `pick()` already does that fallback,
 * so leaving `rw` empty here reproduces the current page exactly.
 */
export interface LibraryContent {
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

export const LIBRARY_DEFAULT: LibraryContent = {
  header: {
    title: tri('Library', 'Isomero', 'المكتبة'),
    subtitle: tri(
      'Read from our collection of Islamic books.',
      "Soma mu bitabo by'Islamu dufite.",
      'اقرأ من مجموعتنا من الكتب الإسلامية.',
    ),
  },
  empty: {
    title: tri('No books found', '', 'لا توجد كتب'),
    body: tri(
      'Try clearing your filters or searching for something else.',
      '',
      'جرّب إزالة عوامل التصفية أو البحث عن شيء آخر.',
    ),
  },
  error: {
    title: tri('Could not load the library', '', 'تعذّر تحميل المكتبة'),
    body: tri(
      'Something went wrong. Please try again.',
      '',
      'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    ),
  },
};
