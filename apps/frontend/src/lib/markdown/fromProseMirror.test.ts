import { markdownFromDoc } from './fromProseMirror';

/**
 * The admin writes answers in TipTap; they are STORED as markdown, because stored
 * markdown is inert and stored HTML is not. This is the conversion that makes both
 * true at once, so it is the one piece of this feature that genuinely must be right:
 * a bug here silently corrupts what a scholar wrote, and the damage lands in the
 * database rather than on the screen where somebody would notice.
 */
const doc = (...content: unknown[]) => ({ type: 'doc', content }) as never;
const p = (...content: unknown[]) => ({ type: 'paragraph', content });
const text = (t: string, marks?: unknown[]) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });

describe('markdownFromDoc', () => {
  it('returns an empty string for an empty document', () => {
    expect(markdownFromDoc(null)).toBe('');
    expect(markdownFromDoc({ type: 'doc', content: [] })).toBe('');
  });

  it('separates blocks with a blank line, so they stay separate blocks', () => {
    expect(markdownFromDoc(doc(p(text('One')), p(text('Two'))))).toBe('One\n\nTwo');
  });

  // TipTap adds a trailing empty paragraph freely; without this they accumulate on
  // every save until the source is mostly blank lines.
  it('drops empty blocks rather than accumulating blank lines', () => {
    expect(markdownFromDoc(doc(p(text('One')), p(), p()))).toBe('One');
  });

  it('writes the inline marks', () => {
    expect(markdownFromDoc(doc(p(text('bold', [{ type: 'bold' }]))))).toBe('**bold**');
    expect(markdownFromDoc(doc(p(text('it', [{ type: 'italic' }]))))).toBe('*it*');
    expect(markdownFromDoc(doc(p(text('gone', [{ type: 'strike' }]))))).toBe('~~gone~~');
  });

  it('writes links with their href', () => {
    const marks = [{ type: 'link', attrs: { href: 'https://rmc.rw' } }];
    expect(markdownFromDoc(doc(p(text('RMC', marks))))).toBe('[RMC](https://rmc.rw)');
  });

  // An unescaped ) closes the link early and the rest of the URL leaks into the page.
  it('escapes a closing parenthesis in a URL', () => {
    const marks = [{ type: 'link', attrs: { href: 'https://x.rw/a(b)c' } }];
    expect(markdownFromDoc(doc(p(text('x', marks))))).toBe('[x](https://x.rw/a(b%29c)');
  });

  // Markdown has no emphasis inside a code span — ** would print literally.
  it('does not combine code with other marks', () => {
    const marks = [{ type: 'code' }, { type: 'bold' }];
    expect(markdownFromDoc(doc(p(text('const x', marks))))).toBe('`const x`');
  });

  // Otherwise a scholar writing "the * symbol" gets italics from there to the next star.
  it('escapes characters that would read as markdown syntax', () => {
    expect(markdownFromDoc(doc(p(text('a * b _ c'))))).toBe('a \\* b \\_ c');
  });

  it('writes headings at their level', () => {
    const h = { type: 'heading', attrs: { level: 3 }, content: [text('Ruling')] };
    expect(markdownFromDoc(doc(h))).toBe('### Ruling');
  });

  it('writes bullet and ordered lists', () => {
    const li = (t: string) => ({ type: 'listItem', content: [p(text(t))] });
    expect(markdownFromDoc(doc({ type: 'bulletList', content: [li('one'), li('two')] }))).toBe(
      '- one\n- two',
    );
    expect(markdownFromDoc(doc({ type: 'orderedList', content: [li('one'), li('two')] }))).toBe(
      '1. one\n2. two',
    );
  });

  // Indented, or the nested list detaches and renders as a sibling of the outer one.
  it('indents a nested list under its parent item', () => {
    const inner = {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [p(text('inner'))] }],
    };
    const outer = {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [p(text('outer')), inner] }],
    };
    expect(markdownFromDoc(doc(outer))).toBe('- outer\n  - inner');
  });

  it('prefixes every line of a blockquote', () => {
    const quote = { type: 'blockquote', content: [p(text('One')), p(text('Two'))] };
    expect(markdownFromDoc(doc(quote))).toBe('> One\n> \n> Two');
  });

  // Escaping inside a fence would print the backslashes as code.
  it('leaves code blocks unescaped', () => {
    const code = {
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const a = b * c;' }],
    };
    expect(markdownFromDoc(doc(code))).toBe('```ts\nconst a = b * c;\n```');
  });

  it('writes images and horizontal rules', () => {
    const img = { type: 'image', attrs: { src: '/a.png', alt: 'A' } };
    expect(markdownFromDoc(doc(img))).toBe('![A](/a.png)');
    expect(markdownFromDoc(doc({ type: 'horizontalRule' }))).toBe('---');
  });

  // Two trailing spaces IS the markdown line break; a bare newline is just a space.
  it('writes a hard break as two trailing spaces', () => {
    expect(markdownFromDoc(doc(p(text('a'), { type: 'hardBreak' }, text('b'))))).toBe('a  \nb');
  });

  // Losing a heading's styling is a far smaller failure than losing the sentence.
  it('keeps the text of a node type it does not recognise', () => {
    const odd = { type: 'someFutureExtension', content: [text('still here')] };
    expect(markdownFromDoc(doc(odd))).toBe('still here');
  });
});
