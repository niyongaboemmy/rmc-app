import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import ar from './ar.json';
import en from './en.json';
import rw from './rw.json';

/**
 * Every message key written as a LITERAL in the source resolves to a string, in
 * every locale.
 *
 * ── Why a hand-written list was not enough ──────────────────────────────────
 *
 * This is the second attempt. The first listed the keys the discussions UI uses
 * and checked those — and missed the very next instance of the bug it was written
 * for, because the broken key belonged to the Navbar and was not on the list.
 *
 * The bug, three times now: adding a GROUP under a name that already holds a leaf
 * silently replaces it. `discussions.views` became `{ categories }` and the read
 * count on the entry page turned into the text "dawah.discussions.views".
 * Renaming the group to `nav` then destroyed `discussions.nav`, the Navbar's
 * Dawah dropdown label — the fix caused the next occurrence. Nothing fails: not
 * the typecheck, not the build, not the render. Only a person looking at the page
 * sees it.
 *
 * So this scans instead of trusting a list. A curated list can only cover what
 * its author remembered; that is the failure mode, not a detail of it.
 *
 * ── What it can and cannot see ──────────────────────────────────────────────
 *
 * Only literal single-argument calls — `t('discussions.title')` — where the
 * namespace comes from `useTranslations('x')` or `getTranslations('x')` in the
 * same file. A key built from a template or a variable is skipped, deliberately
 * and visibly: resolving those needs the value, and a scraper that guessed would
 * report success it has not earned. Those remain uncovered, and the count below
 * is asserted so that silently scanning nothing fails loudly.
 */
const LOCALES = { en, rw, ar } as const;
const SRC = join(__dirname, '..');

/** Files worth scanning: the app's own source, not tests or generated output. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'messages') continue;
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * `const t = useTranslations('dawah')` → { t: ['dawah'] }.
 *
 * A LIST per binding, not one namespace. A file often holds two components, each
 * binding `t` to a different namespace — admin/funeral/requests/[id] does exactly
 * that, with `services.funeral` in one and `admin.funeral` in the other. Keeping
 * only the last attributed forty-one of the first component's keys to the second
 * namespace and reported every one as broken, when all of them resolve.
 *
 * Getting this exactly right means following scope, which means parsing. Instead
 * a key is accepted if it resolves under ANY namespace that binding takes in the
 * file. That is weaker in one specific way — a key valid under the OTHER
 * component's namespace passes here — and still catches what this exists for: a
 * key that resolves under none, which is what a clobbered leaf becomes.
 */
function namespacesIn(source: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const pattern = /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*'([^']+)'\s*\)/g;
  for (const m of Array.from(source.matchAll(pattern))) {
    found.set(m[1], [...(found.get(m[1]) ?? []), m[2]]);
  }
  return found;
}

function resolve(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
    return undefined;
  }, root);
}

/**
 * Every literal key found in the source, with the full paths it could mean.
 * One entry per distinct call; `paths` has more than one only where a binding is
 * reused across namespaces in the same file.
 */
const KEYS: { label: string; paths: string[] }[] = (() => {
  const byLabel = new Map<string, string[]>();
  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    const namespaces = namespacesIn(source);
    if (!namespaces.size) continue;

    for (const [binding, candidates] of Array.from(namespaces.entries())) {
      // `t('a.b')` — a single quoted first argument. A call with a second argument
      // (a plural's `{ count }`) still matches, since only the first is captured.
      const call = new RegExp(`\\b${binding}\\(\\s*'([^']+)'`, 'g');
      for (const m of Array.from(source.matchAll(call))) {
        const paths = candidates.map((ns) => `${ns}.${m[1]}`);
        byLabel.set(paths.join(' | '), paths);
      }
    }
  }
  return Array.from(byLabel.entries())
    .map(([label, paths]) => ({ label, paths }))
    .sort((a, b) => a.label.localeCompare(b.label));
})();

/**
 * Keys this scanner found broken that predate it, in flows outside the work that
 * added it.
 *
 * They are real: `t('fees.title')` under `services.marriage.apply` and
 * `t('processing')` under `services.conduct.apply` both resolve to nothing, so
 * those wizards render the key's own text where a label belongs. Neither was
 * noticed because both sit at a later step that an initial page load does not
 * reach.
 *
 * Listed rather than fixed. Supplying the missing copy means inventing
 * user-facing wording in three languages for a feature whose intent is somebody
 * else's — worse than leaving the debt visible. Listed rather than ignored, so
 * the guard can land for everything else instead of waiting on them.
 *
 * Delete an entry when its key is added; the test then covers it like any other.
 */
const KNOWN_BROKEN = new Set([
  'services.marriage.apply.fees.title',
  'services.conduct.apply.processing',
]);

describe('message keys used as literals in the source', () => {
  // A scanner that finds nothing passes every other case in this file. This is
  // the assertion that stops it doing so quietly.
  it('finds a substantial number of keys to check', () => {
    expect(KEYS.length).toBeGreaterThan(200);
  });

  // An entry that has been fixed should leave the list, or it hides the next
  // regression at that exact path.
  it('has no stale entries in the known-broken list', () => {
    const stale = Array.from(KNOWN_BROKEN).filter((path) => typeof resolve(en, path) === 'string');

    expect(stale).toEqual([]);
  });

  describe.each(Object.entries(LOCALES))('%s', (_locale, catalogue) => {
    it('resolves every one of them to a string', () => {
      const broken = KEYS.filter(
        ({ paths }) =>
          !paths.some((path) => typeof resolve(catalogue, path) === 'string') &&
          !paths.every((path) => KNOWN_BROKEN.has(path)),
      ).map(({ label }) => label);

      // Named in the failure, because "12 keys are wrong" is not actionable.
      expect(broken).toEqual([]);
    });
  });
});
