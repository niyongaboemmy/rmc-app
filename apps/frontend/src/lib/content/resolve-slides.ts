/**
 * Resolves carousel slides that are bound to a live record.
 *
 * The Updates & Programs carousel is authored content: an admin writes each
 * slide in three languages and it renders verbatim. That is right for the copy
 * and the headline figures — "12,500+ community members" is a real-world
 * magnitude the database does not know, since `users` counts portal accounts,
 * not the ummah — but it is wrong for anything with a date in it. A slide
 * reading "Scholarships 2025 — applications close June 30th" keeps saying so
 * long after the deadline passes, and nobody notices until an applicant does.
 *
 * So a slide may optionally carry a `source` (see `SlideSource`). When it does,
 * the fields that go stale resolve from `scholarship_programs`:
 *
 *   title    ← the program's trilingual title
 *   ctaHref  ← the program's public detail page
 *   deadline ← computed and appended to the authored description
 *
 * Everything else — badge, image, icon, and the stat pair — stays authored.
 *
 * Every failure falls back to the authored slide rather than blanking it: an
 * unresolvable id (program deleted, or reverted to draft so the public list no
 * longer returns it), a program with no slug, an absent deadline. A homepage
 * slide must always render something.
 *
 * NOT re-exported from `@/lib/content-api`. Nothing in the backend seed needs
 * it, and the barrel is compiled by `apps/backend` — see the note there.
 */

import { readDeadline } from '@/lib/deadline';
import type { ScholarshipProgram } from '@/lib/scholarshipApi';
import { tri, type Tri } from './client';
import type { UpdateSlide } from './updates';

/**
 * Sentence-form deadline copy. The scholarships board renders the same states as
 * bare chips ("Closes in 5 days") from `services.scholarship.landing.deadline.*`;
 * these are the prose equivalents, kept as `Tri` because the carousel resolves
 * all of its copy through `pick()` rather than next-intl.
 */
const CLAUSE = {
  closed: tri(
    'Applications are now closed.',
    'Gusaba byarafunzwe.',
    'باب التقديم مغلق الآن.',
  ),
  today: tri(
    'Applications close today.',
    'Gusaba birangira uyu munsi.',
    'يُغلق باب التقديم اليوم.',
  ),
  tomorrow: tri(
    'Applications close tomorrow.',
    'Gusaba birangira ejo.',
    'يُغلق باب التقديم غداً.',
  ),
  inDays: tri(
    'Applications close in {days} days.',
    'Gusaba birangira mu minsi {days}.',
    'يُغلق باب التقديم خلال {days} أيام.',
  ),
};

function fillDays(t: Tri, days: number): Tri {
  const sub = (s: string) => s.replace('{days}', String(days));
  return { en: sub(t.en), rw: sub(t.rw), ar: sub(t.ar) };
}

/**
 * The deadline sentence for a program, or null when there is nothing to say.
 *
 * An admin can close a program ahead of its date, so an explicit `closed`
 * status outranks the calendar. A program with no deadline is open-ended and
 * gets no clause at all, rather than a "no deadline" filler sentence that would
 * read as noise mid-paragraph.
 */
function deadlineClause(program: ScholarshipProgram): Tri | null {
  if (program.status === 'closed') return CLAUSE.closed;

  const deadline = readDeadline(program.deadline);
  switch (deadline.state) {
    case 'none':
      return null;
    case 'closed':
      return CLAUSE.closed;
    case 'today':
      return CLAUSE.today;
    case 'tomorrow':
      return CLAUSE.tomorrow;
    default:
      return fillDays(CLAUSE.inDays, deadline.days ?? 0);
  }
}

/**
 * Append the clause per language.
 *
 * A language whose body is still untranslated stays EMPTY rather than becoming
 * clause-only: `pick()` treats an empty string as "fall back to English", so
 * writing the Kinyarwanda clause into an empty Kinyarwanda description would
 * make that locale render a bare "Gusaba birangira mu minsi 12." and silently
 * drop the English body it would otherwise have shown.
 */
function appendClause(base: Tri, clause: Tri): Tri {
  const join = (body: string, sentence: string) => {
    const trimmed = body.trim();
    if (!trimmed) return body;
    return sentence ? `${trimmed} ${sentence}` : trimmed;
  };
  return {
    en: join(base.en, clause.en),
    rw: join(base.rw, clause.rw),
    ar: join(base.ar, clause.ar),
  };
}

/** The program's trilingual title, falling back to its single-language column. */
function programTitle(program: ScholarshipProgram): Tri {
  const i18n = program.titleI18n;
  if (i18n?.en?.trim()) return { en: i18n.en, rw: i18n.rw ?? '', ar: i18n.ar ?? '' };
  return tri(program.title);
}

/**
 * True when at least one slide is bound to a live record.
 *
 * The carousel calls this to decide whether to fetch at all, so a homepage whose
 * slides are all authored — which is every homepage until an admin links one —
 * issues no extra request.
 */
export function hasLinkedSlides(items: UpdateSlide[]): boolean {
  return items.some((item) => item.source?.type === 'scholarship-program');
}

/** Apply every slide's binding. Slides without one are returned untouched. */
export function resolveSlides(
  items: UpdateSlide[],
  programs: ScholarshipProgram[],
): UpdateSlide[] {
  if (!hasLinkedSlides(items)) return items;

  const byId = new Map(programs.map((p) => [p.id, p]));

  return items.map((item) => {
    if (item.source?.type !== 'scholarship-program') return item;

    const program = byId.get(item.source.programId);
    if (!program) return item;

    const clause = deadlineClause(program);
    return {
      ...item,
      title: programTitle(program),
      description: clause ? appendClause(item.description, clause) : item.description,
      ctaHref: program.slug ? `/services/scholarship/${program.slug}` : item.ctaHref,
    };
  });
}
