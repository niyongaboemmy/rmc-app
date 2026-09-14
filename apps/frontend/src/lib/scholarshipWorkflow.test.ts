import { scholarshipMoveRule } from './scholarshipWorkflow';
import type { ScholarshipApplicationStatus } from './scholarshipApi';

/**
 * The board's rules, checked against the server's.
 *
 * This file's own header claims "Every refusal below exists because the server
 * would refuse it too". That was not true: rejection had no source-status check
 * on the server at all, so the board was the only thing stopping a draft being
 * rejected out from under an applicant — and it permitted rejecting a CONFIRMED
 * award, which the server has since been taught to refuse.
 *
 * Both ends were changed to agree. This is what stops them drifting apart again:
 * the table below is the same set of transitions `adminUpdateStatus` allows, and
 * a change to either side without the other fails here.
 *
 * Kept as a literal table rather than derived from anything — a rule generated
 * from the same source it is checking proves nothing.
 */
const ALL: ScholarshipApplicationStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'confirmed',
  'rejected',
  'cancelled',
];

/** Exactly what scholarship.service.ts `adminUpdateStatus` accepts. */
const SERVER_ALLOWS: Array<[ScholarshipApplicationStatus, ScholarshipApplicationStatus]> = [
  ['submitted', 'under_review'], // START_REVIEW: only from submitted
  ['under_review', 'approved'], // APPROVE: only from under_review
  ['approved', 'confirmed'], // CONFIRM: only from approved
  ['submitted', 'rejected'], // REJECT: submitted…
  ['under_review', 'rejected'], // …under review…
  ['approved', 'rejected'], // …or an offer not yet accepted
];

const allowed = (from: ScholarshipApplicationStatus, to: ScholarshipApplicationStatus) =>
  scholarshipMoveRule(from, to).allowed;

describe('scholarshipMoveRule agrees with the server', () => {
  it.each(SERVER_ALLOWS)('permits %s → %s, as the server does', (from, to) => {
    expect(allowed(from, to)).toBe(true);
  });

  /**
   * Every other pair. This is the half that matters: a board that permits what
   * the server refuses sends a reviewer a 400 after the card has already moved.
   */
  it('permits nothing else', () => {
    const permitted = ALL.flatMap((from) =>
      ALL.filter((to) => allowed(from, to)).map((to) => `${from} → ${to}`),
    ).sort();

    expect(permitted).toEqual(SERVER_ALLOWS.map(([f, t]) => `${f} → ${t}`).sort());
  });

  describe('the cases that were wrong', () => {
    it('refuses to reject a draft — the applicant has not submitted it', () => {
      expect(allowed('draft', 'rejected')).toBe(false);
    });

    it('refuses to reject a confirmed award', () => {
      expect(allowed('confirmed', 'rejected')).toBe(false);
    });

    it('still allows withdrawing an offer that has not been accepted', () => {
      expect(allowed('approved', 'rejected')).toBe(true);
    });
  });

  it('gives a reason a reviewer can read for every refusal', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        const rule = scholarshipMoveRule(from, to);
        if (!rule.allowed) {
          expect(rule.reason.length).toBeGreaterThan(10);
          expect(rule.reason.endsWith('.')).toBe(true);
        }
      }
    }
  });
});
