/**
 * Slug generation for courses, books and categories.
 *
 * The implementation moved to `common/slugify.util.ts` when scholarship
 * opportunities became a third module needing it — the reason this file gave for
 * existing (one spelling, so two near-copies cannot drift) applies just as much
 * across modules as within Dawah. Re-exported rather than rewritten at the call
 * sites, so the three Dawah services are untouched.
 */
export { slugify } from '../common/slugify.util';
