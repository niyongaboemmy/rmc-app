import {
  boardFaqs,
  boardRequirements,
  boardSteps,
  SCHOLARSHIP_SERVICE_DEFAULT,
  TENDER_SERVICE_DEFAULT,
} from './service-boards';
import { mergeContent, pick, tri } from './client';
import type { Tri } from './client';
import type {
  ScholarshipServiceContent,
  ServiceBoardContent,
  TenderServiceContent,
} from './service-boards';

/**
 * `boardSteps` exists so an admin can DELETE a step.
 *
 * The trap it avoids: `mergeContent` walks arrays by index, so once a step is removed
 * the one that shifts up is merged against the SEEDED step at its new index — and any
 * translation it has not been given is filled from a step that is no longer on the
 * page. The bug is silent: the English reads correctly and only /rw and /ar show text
 * from a step nobody can see any more.
 *
 * It only bites when the translation key is ABSENT rather than empty — an explicit
 * `rw: ''` wins the merge on its own. Absent is the normal shape in this database:
 * migration 059 stripped exactly those blank translation keys. So the fixtures below
 * carry English only, which is what a real saved step looks like post-migration.
 */
describe('boardSteps', () => {
  /** English only, no rw/ar keys at all — the post-migration shape. */
  const enOnly = (en: string) => ({ en }) as unknown as Tri;

  /** A saved blob where the admin deleted the first step and translated nothing. */
  const savedWithFirstStepDeleted = {
    ...TENDER_SERVICE_DEFAULT,
    steps: {
      ...TENDER_SERVICE_DEFAULT.steps,
      items: [
        { id: 'form', title: enOnly('Complete the form'), text: enOnly('Give your company details.') },
        { id: 'track', title: enOnly('Track your bid'), text: enOnly('Follow it to award.') },
      ],
    },
  } as ServiceBoardContent;

  it('returns the seeded steps when the section has never been saved', () => {
    expect(boardSteps(null, TENDER_SERVICE_DEFAULT)).toEqual(TENDER_SERVICE_DEFAULT.steps.items);
    expect(boardSteps({}, TENDER_SERVICE_DEFAULT)).toEqual(TENDER_SERVICE_DEFAULT.steps.items);
  });

  it('honours a deletion instead of restoring the seeded step', () => {
    const steps = boardSteps(savedWithFirstStepDeleted, TENDER_SERVICE_DEFAULT);
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.id)).toEqual(['form', 'track']);
  });

  it('lets an admin remove every step', () => {
    const emptied = {
      ...TENDER_SERVICE_DEFAULT,
      steps: { ...TENDER_SERVICE_DEFAULT.steps, items: [] },
    } as ServiceBoardContent;
    expect(boardSteps(emptied, TENDER_SERVICE_DEFAULT)).toEqual([]);
  });

  it('does not graft a deleted step\'s translations onto its neighbour', () => {
    const steps = boardSteps(savedWithFirstStepDeleted, TENDER_SERVICE_DEFAULT);
    // The step now at index 0 carries no Kinyarwanda of its own, so it must fall back
    // to ITS OWN English — never to the seeded step 0's Kinyarwanda.
    expect(pick(steps[0].title, 'rw')).toBe('Complete the form');
    expect(pick(steps[0].title, 'rw')).not.toBe(
      TENDER_SERVICE_DEFAULT.steps.items[0].title.rw,
    );
  });

  it('is what the merged read would get wrong', () => {
    // Guards the reason this helper exists. If mergeContent ever stops merging arrays
    // by index this will fail, and boardSteps can be reconsidered.
    const merged = mergeContent(TENDER_SERVICE_DEFAULT, savedWithFirstStepDeleted);
    expect(pick(merged.steps.items[0].title, 'rw')).toBe(
      TENDER_SERVICE_DEFAULT.steps.items[0].title.rw,
    );
    expect(pick(merged.steps.items[0].title, 'rw')).not.toBe(
      pick(boardSteps(savedWithFirstStepDeleted, TENDER_SERVICE_DEFAULT)[0].title, 'rw'),
    );
  });

  it('fills a missing id so React keys stay stable', () => {
    const noIds = {
      steps: { items: [{ title: tri('A'), text: tri('a') }] },
    } as unknown as ServiceBoardContent;
    expect(boardSteps(noIds, TENDER_SERVICE_DEFAULT)[0].id).toBe('step-0');
  });

  it('tolerates a malformed entry rather than throwing', () => {
    const broken = { steps: { items: [{}, null] } } as unknown as ServiceBoardContent;
    const steps = boardSteps(broken, TENDER_SERVICE_DEFAULT);
    expect(steps).toHaveLength(2);
    expect(pick(steps[0].title, 'en')).toBe('');
  });
});

/** The FAQ has the same shape of problem, and the same answer. */
describe('boardFaqs', () => {
  const enOnly = (en: string) => ({ en }) as unknown as Tri;

  const savedWithFirstQuestionDeleted = {
    ...SCHOLARSHIP_SERVICE_DEFAULT,
    faq: {
      ...SCHOLARSHIP_SERVICE_DEFAULT.faq,
      items: [
        { id: 'fee', q: enOnly('Is there a fee to apply?'), a: enOnly('No.') },
        { id: 'status', q: enOnly('How do I check my status?'), a: enOnly('Use your tracking number.') },
      ],
    },
  } as ScholarshipServiceContent;

  it('returns the seeded questions when the section has never been saved', () => {
    expect(boardFaqs(null, SCHOLARSHIP_SERVICE_DEFAULT)).toEqual(
      SCHOLARSHIP_SERVICE_DEFAULT.faq.items,
    );
  });

  it('honours a deletion and lets the list be emptied', () => {
    expect(boardFaqs(savedWithFirstQuestionDeleted, SCHOLARSHIP_SERVICE_DEFAULT)).toHaveLength(2);
    const emptied = {
      ...SCHOLARSHIP_SERVICE_DEFAULT,
      faq: { ...SCHOLARSHIP_SERVICE_DEFAULT.faq, items: [] },
    } as ScholarshipServiceContent;
    expect(boardFaqs(emptied, SCHOLARSHIP_SERVICE_DEFAULT)).toEqual([]);
  });

  it('does not graft a deleted question\'s translations onto its neighbour', () => {
    const faqs = boardFaqs(savedWithFirstQuestionDeleted, SCHOLARSHIP_SERVICE_DEFAULT);
    expect(pick(faqs[0].q, 'rw')).toBe('Is there a fee to apply?');
    expect(pick(faqs[0].q, 'rw')).not.toBe(SCHOLARSHIP_SERVICE_DEFAULT.faq.items[0].q.rw);
  });

  it('is what the merged read would get wrong', () => {
    const merged = mergeContent(SCHOLARSHIP_SERVICE_DEFAULT, savedWithFirstQuestionDeleted);
    expect(pick(merged.faq.items[0].q, 'rw')).toBe(
      SCHOLARSHIP_SERVICE_DEFAULT.faq.items[0].q.rw,
    );
  });

  it('fills a missing id so React keys stay stable', () => {
    const noIds = {
      faq: { items: [{ q: tri('A'), a: tri('a') }] },
    } as unknown as ScholarshipServiceContent;
    expect(boardFaqs(noIds, SCHOLARSHIP_SERVICE_DEFAULT)[0].id).toBe('faq-0');
  });
});

/** The tender detail page's bid checklist — third list, same contract. */
describe('boardRequirements', () => {
  const enOnly = (en: string) => ({ en }) as unknown as Tri;

  const savedWithFirstDeleted = {
    ...TENDER_SERVICE_DEFAULT,
    detail: {
      ...TENDER_SERVICE_DEFAULT.detail,
      requirements: {
        ...TENDER_SERVICE_DEFAULT.detail.requirements,
        items: [
          { id: 'tax', title: enOnly('RRA Tax Clearance certificate'), text: enOnly('A valid certificate.') },
          { id: 'proposal', title: enOnly('Technical & Financial Proposal'), text: enOnly('Your full proposal.') },
        ],
      },
    },
  } as TenderServiceContent;

  it('returns the seeded requirements when the section has never been saved', () => {
    expect(boardRequirements(null, TENDER_SERVICE_DEFAULT)).toEqual(
      TENDER_SERVICE_DEFAULT.detail.requirements.items,
    );
  });

  it('honours a deletion and lets the list be emptied', () => {
    expect(boardRequirements(savedWithFirstDeleted, TENDER_SERVICE_DEFAULT)).toHaveLength(2);
    const emptied = {
      ...TENDER_SERVICE_DEFAULT,
      detail: {
        ...TENDER_SERVICE_DEFAULT.detail,
        requirements: { ...TENDER_SERVICE_DEFAULT.detail.requirements, items: [] },
      },
    } as TenderServiceContent;
    expect(boardRequirements(emptied, TENDER_SERVICE_DEFAULT)).toEqual([]);
  });

  it("does not graft a deleted requirement's translations onto its neighbour", () => {
    const reqs = boardRequirements(savedWithFirstDeleted, TENDER_SERVICE_DEFAULT);
    expect(pick(reqs[0].title, 'rw')).toBe('RRA Tax Clearance certificate');
    expect(pick(reqs[0].title, 'rw')).not.toBe(
      TENDER_SERVICE_DEFAULT.detail.requirements.items[0].title.rw,
    );
  });

  it('is what the merged read would get wrong', () => {
    const merged = mergeContent(TENDER_SERVICE_DEFAULT, savedWithFirstDeleted);
    expect(pick(merged.detail.requirements.items[0].title, 'rw')).toBe(
      TENDER_SERVICE_DEFAULT.detail.requirements.items[0].title.rw,
    );
  });
});
