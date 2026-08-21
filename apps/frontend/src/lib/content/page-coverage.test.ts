/**
 * @jest-environment node
 */

/**
 * Every public page must resolve its admin-managed copy on the SERVER.
 *
 * `usePreviewableContent` falls back to fetching on mount when no
 * `SiteContentProvider` supplies its section. That fallback is deliberate — it keeps
 * a section working anywhere — but as a PAGE's only path it is a bug: the
 * server-rendered HTML then carries the built-in defaults, so crawlers and no-JS
 * visitors never see the saved copy, and everyone else sees it swap in after
 * hydration. In a translated locale the seeded copy is complete, so that first paint
 * looks finished while showing text an admin already replaced.
 *
 * This walks the real route tree, resolves each page's content keys through its
 * import graph, and fails when one is left to the client. It is the audit that
 * motivated the server-render work, kept executable: a new page that renders CMS copy
 * client-side fails here with its own route and key named, instead of shipping.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..');
const APP = path.join(SRC, 'app');
const LAYOUT = path.join(APP, '[locale]', 'layout.tsx');

/**
 * Pages whose copy IS server-rendered, but not through a key this file can see.
 *
 * Keep this list short and justified — every entry is a page the guard cannot check,
 * so an unexplained addition is how the rule quietly stops applying.
 */
const SERVER_RESOLVED_ELSEWHERE: Record<string, string[]> = {
  // getPosts() awaits the `blog` section in the server component and passes plain
  // post objects down; no client component reads the section itself.
  'blog/page.tsx': ['blog'],
  'blog/[slug]/page.tsx': ['blog'],
};

/** Resolve an import specifier to a file inside src/, or null if it leaves the tree. */
function resolveImport(spec: string, from: string): string | null {
  if (!spec.startsWith('@/') && !spec.startsWith('.')) return null;
  const base = spec.startsWith('@/')
    ? path.join(SRC, spec.slice(2))
    : path.resolve(path.dirname(from), spec);
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  return fs.existsSync(base) && fs.statSync(base).isFile() ? base : null;
}

/** Every `ContentKeys.x` identifier reachable from `file`, following local imports. */
function contentKeysOf(file: string, seen = new Set<string>()): Set<string> {
  const out = new Set<string>();
  if (seen.has(file)) return out;
  seen.add(file);

  let src: string;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    return out;
  }

  // Array.from throughout, not spread/for-of over the iterator: the repo tsconfig
  // sets no `target`, so plain `tsc` compiles as ES5 and rejects iterating one.
  for (const m of Array.from(src.matchAll(/ContentKeys\.([a-zA-Z]+)/g))) out.add(m[1]);

  for (const m of Array.from(src.matchAll(/from\s+['"]([^'"]+)['"]/g))) {
    const target = resolveImport(m[1], file);
    // The barrel and the key table only DECLARE the keys — walking into them would
    // report every key in the app as reachable from every page.
    if (!target) continue;
    if (target.endsWith(path.join('lib', 'content-api.ts'))) continue;
    if (target.endsWith(path.join('content', 'client.ts'))) continue;
    Array.from(contentKeysOf(target, seen)).forEach((k) => out.add(k));
  }
  return out;
}

function pageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) pageFiles(p, acc);
    else if (entry.name === 'page.tsx') acc.push(p);
  }
  return acc;
}

/** The keys the locale layout supplies to every page under it. */
function sharedKeys(): Set<string> {
  const src = fs.readFileSync(LAYOUT, 'utf8');
  const block = src.match(/const SHARED_CONTENT_KEYS[^[]*\[([^\]]*)\]/);
  if (!block) throw new Error('SHARED_CONTENT_KEYS not found in the locale layout');
  return new Set(
    Array.from(block[1].matchAll(/ContentKeys\.([a-zA-Z]+)/g)).map((m) => m[1]),
  );
}

describe('server-rendered content coverage', () => {
  const shared = sharedKeys();

  // Admin routes are auth-gated editors: no crawler sees them and an admin loading
  // the editor is already waiting on a fetch, so the client path is correct there.
  const pages = pageFiles(APP)
    .filter((p) => !p.includes(`${path.sep}admin${path.sep}`))
    .map((p) => ({ abs: p, rel: path.relative(path.join(APP, '[locale]'), p) }));

  it('finds the route tree and the layout key list', () => {
    expect(pages.length).toBeGreaterThan(50);
    expect(shared.size).toBeGreaterThan(0);
  });

  it.each(pages)('$rel resolves its content on the server', ({ abs, rel }) => {
    const keys = contentKeysOf(abs);
    if (keys.size === 0) return;

    const src = fs.readFileSync(abs, 'utf8');
    const isClientRoot = /^\s*['"]use client['"]/.test(src);
    const allowed = SERVER_RESOLVED_ELSEWHERE[rel.split(path.sep).join('/')] ?? [];

    const uncovered = Array.from(keys).filter((key) => {
      if (shared.has(key)) return false;
      if (allowed.includes(key)) return false;
      // A server page that names the key either hands it to a SiteContentProvider or
      // reads it into its own markup — both put the copy in the HTML.
      return isClientRoot || !new RegExp(`ContentKeys\\.${key}\\b`).test(src);
    });

    expect({ page: rel, uncovered }).toEqual({ page: rel, uncovered: [] });
  });
});
