import ar from './ar.json';
import en from './en.json';
import rw from './rw.json';

/**
 * That the Dawah discussions keys the UI calls still resolve to strings.
 *
 * This exists because of a specific failure, twice. Adding a group of related
 * labels under a name that already held a leaf silently REPLACES it: writing
 * `discussions.views = { categories: '…' }` for a sidebar label destroyed
 * `discussions.views`, the plural that counts reads on the entry page. Nothing
 * failed — not the typecheck, not the tests, not the build. The entry page simply
 * rendered the literal text "dawah.discussions.views" where a number belonged,
 * and it took someone looking at the page to notice.
 *
 * Type is the whole point of the assertion. A missing key is loud in next-intl;
 * a key that turned into an object is silent, and that is the one that shipped.
 *
 * Keys are listed by hand rather than scraped from the source. A scraper would
 * have to resolve template strings and dynamic namespaces to be honest, and one
 * that quietly missed a call site would give false assurance — which is exactly
 * the failure this is here to prevent.
 */
const LOCALES = { en, rw, ar } as const;

/** Dotted paths under `dawah.discussions` that the UI resolves as strings. */
const STRING_KEYS = [
  'title',
  'subtitle',
  'count',
  'views',
  'searchLabel',
  'searchPlaceholder',
  'searchCategories',
  'noCategories',
  'empty',
  'emptyFiltered',
  'loadError',
  'clearFilters',
  'otherLanguages',
  'askCta',
  'download',
  'share',
  'linkCopied',
  'contents',
  'nav.categories',
  'rating.yes',
  'rating.no',
  'rating.failed',
  'rating.send',
  'rating.commentLabel',
  'rating.emailLabel',
  'rating.reasonLabel',
  'admin.answerLabel',
  'admin.questionLabel',
  'admin.summaryLabel',
  'admin.answerSummaryLabel',
  'admin.essentialLabel',
  'admin.entryNumber',
] as const;

function resolve(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
    return undefined;
  }, root);
}

describe.each(Object.entries(LOCALES))('%s messages', (_locale, catalogue) => {
  const discussions = resolve(catalogue, 'dawah.discussions');

  it.each(STRING_KEYS)('dawah.discussions.%s is a string', (key) => {
    const value = resolve(discussions, key);

    // Named separately so a failure says which of the two happened: a key that is
    // gone reads differently from one a namespace grew over.
    expect(value).toBeDefined();
    expect(typeof value).toBe('string');
  });
});

/**
 * Every locale carries every key. A translation missing from one language renders
 * that language's page with the key name in it, which is the same visible failure
 * as above arriving by a different route.
 */
describe('locale parity', () => {
  it.each(STRING_KEYS)('dawah.discussions.%s exists in all three locales', (key) => {
    const present = Object.entries(LOCALES)
      .filter(([, catalogue]) => typeof resolve(catalogue, `dawah.discussions.${key}`) === 'string')
      .map(([locale]) => locale);

    expect(present).toEqual(['en', 'rw', 'ar']);
  });
});
