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

  // Every level the toolbar offers is anchored, h1 included. It stopped being
  // "the page's" the moment the editor grew a button for it — a heading with no
  // anchor is one the contents list cannot reach.
  it('anchors all six levels', () => {
    const { toc } = addHeadingAnchors(
      '<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>',
    );

    expect(toc.map((e) => e.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  /**
   * Cases the first version got wrong. Each shipped, and each was found by probing
   * the function rather than by a test failing — which is why they are written down
   * now.
   */
  describe('what the first version got wrong', () => {
    // `&nbsp;` and `&hellip;` rendered as literal text AND became part of the id:
    // "answer-fasting-travel-nbsp-hellip".
    it('decodes named entities rather than slugging them', () => {
      const { toc } = addHeadingAnchors('<h2>Fasting &amp; travel &nbsp;&hellip;</h2>');

      expect(toc[0].text).toBe('Fasting & travel …');
      expect(toc[0].id).not.toContain('nbsp');
      expect(toc[0].id).not.toContain('hellip');
    });

    it('decodes numeric entities, decimal and hex alike', () => {
      expect(addHeadingAnchors('<h2>A&#8230;B</h2>').toc[0].text).toBe('A…B');
      expect(addHeadingAnchors('<h2>A&#x2026;B</h2>').toc[0].text).toBe('A…B');
    });

    it('leaves an unknown entity alone rather than mangling it', () => {
      expect(addHeadingAnchors('<h2>A &notareal; B</h2>').toc[0].text).toBe('A &notareal; B');
    });

    // An empty heading became an entry with no text — a blank row in the contents
    // that reads as a broken link.
    it('skips an empty heading instead of listing a blank row', () => {
      const { html, toc } = addHeadingAnchors('<h2></h2><h3>Real</h3>');

      expect(toc.map((e) => e.text)).toEqual(['Real']);
      expect(html).toContain('<h2></h2>');
    });

    it('skips a whitespace-only heading too', () => {
      expect(addHeadingAnchors('<h2>   </h2>').toc).toEqual([]);
    });

    // The regex matched `<h2>` exactly, so it depended on a sanitiser config it does
    // not import: allow one attribute on a heading and every anchor vanishes
    // silently. It now tolerates attributes — and discards them, since stamping the
    // id is the whole point.
    it('still anchors a heading that carries attributes', () => {
      const { html, toc } = addHeadingAnchors('<h2 class="x">Title</h2>');

      expect(toc).toHaveLength(1);
      expect(html).toContain('<h2 id="answer-title">');
      expect(html).not.toContain('class="x"');
    });

    it('drops an id an author somehow got through, rather than keeping it', () => {
      const { html } = addHeadingAnchors('<h3 id="evil">T</h3>');

      expect(html).not.toContain('id="evil"');
      expect(html).toContain('id="answer-t"');
    });

    // Numbering counts LISTED headings, so skipping an empty one does not leave a
    // gap in the positional fallbacks.
    it('numbers the fallbacks by listed position', () => {
      const { toc } = addHeadingAnchors('<h2>  </h2><h2>عربي</h2>');

      expect(toc).toHaveLength(1);
      expect(toc[0].id).toBe('answer-s1');
    });
  });
});
