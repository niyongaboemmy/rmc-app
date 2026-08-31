import { addHeadingAnchors } from './discussions-toc';

/**
 * Anchors for a long answer's headings, and the contents list built from them.
 *
 * Two things here are security properties rather than conveniences, and both are
 * easy to lose in a refactor that "simplifies" the ordering:
 *
 *   - the ids are stamped AFTER sanitising, so an id written by an author never
 *     reaches the page. An id is not inert — one colliding with an element the
 *     app already uses can hijack a `label[for]` or an `aria-labelledby`.
 *   - they are namespaced, so even a heading named after a real element id cannot
 *     collide with it.
 *
 * These exercise `addHeadingAnchors`, which takes html the sanitiser has already
 * cleaned. It is split out from the render precisely so it can be reached: `marked`
 * and sanitize-html are both ESM-only and neither loads under this CJS suite, and a
 * rule this load-bearing should not go untested because of a module format.
 *
 * What is therefore NOT covered here, and was verified by hand instead: that the
 * sanitiser strips an author's `id`, and that an `<h2>` survives it at all. Both
 * belong to the sanitiser's configuration rather than to this function.
 */
describe('addHeadingAnchors', () => {
  it('returns nothing for an empty answer', () => {
    expect(addHeadingAnchors('')).toEqual({ html: '', toc: [] });
  });

  it('finds the headings and records their level', () => {
    const { toc } = addHeadingAnchors('<h2>The ruling</h2><p>Yes.</p><h3>Evidence</h3>');

    expect(toc).toEqual([
      { id: 'answer-the-ruling', text: 'The ruling', level: 2 },
      { id: 'answer-evidence', text: 'Evidence', level: 3 },
    ]);
  });

  it('puts the same ids in the markup as in the list', () => {
    const { html, toc } = addHeadingAnchors('<h2>One</h2><h3>Two</h3><h4>Three</h4>');

    expect(toc).toHaveLength(3);
    for (const entry of toc) expect(html).toContain(`id="${entry.id}"`);
  });

  // Ordinary in a long ruling — "Evidence" under two sections. A repeated id would
  // send both links to the first.
  it('disambiguates repeated headings', () => {
    const { toc } = addHeadingAnchors('<h3>Evidence</h3><p>a</p><h3>Evidence</h3>');

    expect(toc.map((e) => e.id)).toEqual(['answer-evidence', 'answer-evidence-2']);
  });

  // slugify reduces to [a-z0-9], so Arabic slugs to the empty string. A positional
  // id is unreadable but it works, which is the whole job of an anchor.
  it('falls back to a positional id for a non-Latin heading', () => {
    const { html, toc } = addHeadingAnchors('<h2>ما حكم صلاة الجمعة</h2>');

    expect(toc).toHaveLength(1);
    expect(toc[0].id).toMatch(/^answer-s\d+$/);
    expect(toc[0].text).toBe('ما حكم صلاة الجمعة');
    expect(html).toContain(`id="${toc[0].id}"`);
  });

  it('lists the words of a heading, not its markup', () => {
    const { toc } = addHeadingAnchors('<h3>The <strong>ruling</strong> on <code>wudu</code></h3>');

    expect(toc[0].text).toBe('The ruling on wudu');
  });

  // Every id this produces is namespaced, so none can collide with an element the
  // page already defines however a heading is worded.
  it('namespaces every id it generates', () => {
    const { toc } = addHeadingAnchors('<h2>main</h2><h3>nav</h3><h4>footer</h4>');

    for (const entry of toc) expect(entry.id.startsWith('answer-')).toBe(true);
  });

  it('leaves an answer with no headings alone', () => {
    const { html, toc } = addHeadingAnchors('<p>Just a paragraph, no structure at all.</p>');

    expect(toc).toEqual([]);
    expect(html).toBe('<p>Just a paragraph, no structure at all.</p>');
  });

  it('does not touch h1, which belongs to the page', () => {
    const { toc } = addHeadingAnchors('<h1>Page title</h1><h2>Section</h2>');

    expect(toc.map((e) => e.level)).toEqual([2]);
  });
});
