import type { JSONContent } from '@tiptap/react';

/**
 * Serialises a TipTap document to markdown.
 *
 * ── Why this exists rather than an HTML→markdown library ─────────────────────
 *
 * Q&A answers are stored as MARKDOWN, never HTML — see the DawahQuestion entity.
 * Stored markdown is inert: a future bug in the read-time sanitiser cannot
 * release a payload that is already sitting in the database, because there is no
 * payload to release. Storing the editor's HTML would give that up.
 *
 * So the admin writes in TipTap and we convert back on save. The obvious way is
 * turndown, but it parses HTML — and we do not have HTML, we have TipTap's own
 * document. Serialising from the structured document is strictly safer: the node
 * and mark types are a closed set we control through the editor's extensions, so
 * there is no parsing and no ambiguity about what a given tag meant.
 *
 * ── What it covers ───────────────────────────────────────────────────────────
 *
 * Exactly what RichTextEditor's toolbar can produce: paragraphs, h2/h3, bold,
 * italic, code, links, bullet and ordered lists, blockquotes, code blocks,
 * horizontal rules, hard breaks and images. An unknown node falls through to its
 * text content rather than being dropped — losing a heading's styling is a much
 * smaller failure than losing the sentence inside it.
 */

/** Characters that would otherwise be read as markdown syntax in body text. */
function escapeText(text: string): string {
  return text.replace(/([\\`*_[\]])/g, '\\$1');
}

function applyMarks(text: string, marks: JSONContent['marks']): string {
  if (!marks?.length) return text;

  let out = text;
  // `code` first and alone: markdown has no emphasis inside a code span, so
  // wrapping it in ** would print the asterisks literally.
  if (marks.some((m) => m.type === 'code')) return `\`${out.replace(/`/g, '')}\``;

  for (const mark of marks) {
    if (mark.type === 'bold') out = `**${out}**`;
    else if (mark.type === 'italic') out = `*${out}*`;
    else if (mark.type === 'strike') out = `~~${out}~~`;
    else if (mark.type === 'link') {
      const href = (mark.attrs?.href as string | undefined) ?? '';
      // Parentheses in a URL would close the markdown link early.
      out = `[${out}](${href.replace(/\)/g, '%29')})`;
    }
  }
  return out;
}

/** Inline content: text runs with their marks, plus hard breaks and inline images. */
function inline(nodes: JSONContent[] | undefined): string {
  if (!nodes?.length) return '';
  return nodes
    .map((node) => {
      if (node.type === 'text') return applyMarks(escapeText(node.text ?? ''), node.marks);
      // Two trailing spaces is the markdown line break; \n alone is just a space.
      if (node.type === 'hardBreak') return '  \n';
      if (node.type === 'image') {
        const src = (node.attrs?.src as string | undefined) ?? '';
        const alt = (node.attrs?.alt as string | undefined) ?? '';
        return `![${alt}](${src})`;
      }
      return inline(node.content);
    })
    .join('');
}

function listItems(node: JSONContent, ordered: boolean): string {
  return (node.content ?? [])
    .map((item, i) => {
      const marker = ordered ? `${i + 1}. ` : '- ';
      // A list item holds blocks. The first sits beside the marker; the rest are
      // indented under it, which is what keeps a nested list attached to its parent.
      //
      // Children render at NO indent and the indent is applied here, to every line
      // of each continuation block. That is what makes nesting compose: a list two
      // deep is indented once by its own parent and again by ITS parent, rather
      // than trying to know its own depth. Threading a depth counter through as
      // well double-indented every nested list.
      const blocks = (item.content ?? []).map((child) => block(child)).filter(Boolean);
      const [first = '', ...rest] = blocks;
      if (!rest.length) return `${marker}${first}`;
      return [`${marker}${first}`, ...rest.map((b) => b.replace(/^/gm, '  '))].join('\n');
    })
    .join('\n');
}

function block(node: JSONContent): string {
  switch (node.type) {
    case 'paragraph':
      return inline(node.content);
    case 'heading': {
      const level = Math.min(6, Math.max(1, (node.attrs?.level as number | undefined) ?? 2));
      return `${'#'.repeat(level)} ${inline(node.content)}`;
    }
    case 'bulletList':
      return listItems(node, false);
    case 'orderedList':
      return listItems(node, true);
    case 'blockquote':
      return (node.content ?? [])
        .map((child) => block(child))
        .join('\n\n')
        .replace(/^/gm, '> ');
    case 'codeBlock': {
      const language = (node.attrs?.language as string | undefined) ?? '';
      // Raw text — escaping inside a fence would print the backslashes.
      const code = (node.content ?? []).map((c) => c.text ?? '').join('');
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }
    case 'horizontalRule':
      return '---';
    case 'image': {
      const src = (node.attrs?.src as string | undefined) ?? '';
      const alt = (node.attrs?.alt as string | undefined) ?? '';
      return `![${alt}](${src})`;
    }
    default:
      // Unknown node: keep the words. See the note above about failure modes.
      return inline(node.content);
  }
}

/**
 * TipTap document → markdown.
 *
 * Blocks are separated by a blank line, which is what makes them separate blocks
 * in markdown rather than one run-on paragraph. Empty blocks are dropped so a
 * stray trailing paragraph — which TipTap adds freely — does not accumulate
 * blank lines on every save.
 */
export function markdownFromDoc(doc: JSONContent | null | undefined): string {
  if (!doc?.content?.length) return '';
  return doc.content
    .map((node) => block(node))
    .map((s) => s.trimEnd())
    .filter((s) => s.length > 0)
    .join('\n\n')
    .trim();
}
