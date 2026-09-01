import type { DiscussionQuestion } from '@/lib/dawahApi';

/**
 * Show the contents as soon as there is a heading to list.
 *
 * This was 2, on the reasoning that a one-item list is a heading with extra steps.
 * That reads well and was wrong in practice: an answer with a single heading
 * showed nothing, which is indistinguishable from the feature being broken — and
 * was reported as exactly that. A reader cannot tell "we decided one is not worth
 * listing" from "the contents list does not work", and the second costs more than
 * a slightly redundant box.
 *
 * An answer with NO headings still shows nothing, because there is genuinely
 * nothing to list.
 */
const MIN_HEADINGS = 1;

/**
 * The table of contents for a long answer.
 *
 * Server-rendered from the same pass that stamped the anchors, so the links and
 * the ids cannot drift apart — and so it is in the HTML for a crawler and for a
 * reader with no JavaScript, both of whom are exactly who a long ruling is for.
 *
 * Plain `#id` links, not scroll handlers: they work before hydration, they are
 * shareable, and Back returns the reader to where they jumped from.
 *
 * Hidden in print. On paper every heading is already visible on the page, and a
 * list of links that cannot be followed is furniture.
 */
export function AnswerContents({
  toc,
  label,
  dir,
}: {
  toc: DiscussionQuestion['answerToc'];
  label: string;
  dir: 'ltr' | 'rtl';
}) {
  if (toc.length < MIN_HEADINGS) return null;

  // The shallowest heading present, so a ruling written entirely in h3 is not
  // indented as though something above it were missing.
  const top = Math.min(...toc.map((h) => h.level));

  return (
    <nav
      data-print-hide
      aria-label={label}
      dir={dir}
      className="mt-3 rounded-lg border border-gray-200 bg-gray-50/70 px-4 py-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>
      <ol className="mt-2 space-y-1.5">
        {toc.map((h) => (
          <li
            key={h.id}
            // Indent by depth BELOW the shallowest, in the inline direction so it
            // reverses under RTL rather than pushing Arabic away from its margin.
            style={{ marginInlineStart: `${(h.level - top) * 0.875}rem` }}
          >
            <a
              href={`#${h.id}`}
              className="block [overflow-wrap:anywhere] text-[13px] leading-snug text-gray-600 underline-offset-2 transition-colors hover:text-rmc-green hover:underline"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
