import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AnswerQuestionDto, CreateEntryDto } from './create-entry.dto';
import { CreateQuestionDto } from './create-question.dto';
import { DISCUSSION_LIMITS } from '../discussions.constants';

/**
 * How long an answer is allowed to be.
 *
 * The cap was 20,000 characters — about 3,000 words — which a ruling that sets out
 * its evidence and cites its sources can exceed. Nothing in the database wanted
 * that number: the column is `text`. It was the DTO's opinion, and losing a long
 * answer to a validation error is the kind of failure that costs somebody an
 * evening's work.
 *
 * These run the real validators rather than reading the decorators, because the
 * thing worth knowing is what the pipe would actually do to a request.
 */
const chars = (n: number) => 'a'.repeat(n);

const errorsOn = async (dto: object, field: string) => {
  const found = await validate(dto);
  return found.some((e) => e.property === field);
};

describe('discussion length limits', () => {
  describe('an admin-authored entry', () => {
    const entry = (over: Partial<CreateEntryDto> = {}) =>
      plainToInstance(CreateEntryDto, {
        title: 'A question long enough to pass',
        answerBody: 'An answer long enough to pass',
        language: 'en',
        ...over,
      });

    it('accepts an answer far longer than the old 20,000 cap', async () => {
      expect(await errorsOn(entry({ answerBody: chars(150_000) }), 'answerBody')).toBe(false);
    });

    it('accepts an answer at exactly the limit', async () => {
      const atLimit = chars(DISCUSSION_LIMITS.MAX_ADMIN_BODY_LENGTH);
      expect(await errorsOn(entry({ answerBody: atLimit }), 'answerBody')).toBe(false);
    });

    // Still bounded: an unlimited text field is a way to fill a table.
    it('rejects one past the limit', async () => {
      const over = chars(DISCUSSION_LIMITS.MAX_ADMIN_BODY_LENGTH + 1);
      expect(await errorsOn(entry({ answerBody: over }), 'answerBody')).toBe(true);
    });

    it('applies the same ceiling to the question detail', async () => {
      expect(await errorsOn(entry({ body: chars(150_000) }), 'body')).toBe(false);
    });
  });

  // The submissions queue answers through a different DTO; the ceiling has to match,
  // or where an answer is written would decide how long it may be.
  it('answers a submission under the same ceiling', async () => {
    const dto = plainToInstance(AnswerQuestionDto, { answerBody: chars(150_000) });
    expect(await errorsOn(dto, 'answerBody')).toBe(false);
  });

  // Deliberately NOT raised. That route is @Public(), so its body size is an abuse
  // surface in a way an authenticated admin's is not.
  describe("a member's submitted question", () => {
    const question = (body: string) =>
      plainToInstance(CreateQuestionDto, {
        title: 'A question long enough to pass',
        body,
        language: 'en',
      });

    // Asserted against the ADMIN ceiling, not against its own constant. Testing that
    // `MAX_MEMBER_BODY_LENGTH + 1` is rejected passes whatever that constant holds —
    // it would have stayed green with the public cap raised to the admin's, which is
    // the one change this is here to prevent.
    it('stays well below the admin ceiling', () => {
      expect(DISCUSSION_LIMITS.MAX_MEMBER_BODY_LENGTH).toBeLessThan(
        DISCUSSION_LIMITS.MAX_ADMIN_BODY_LENGTH / 2,
      );
    });

    it('rejects a body past the public cap', async () => {
      const over = chars(DISCUSSION_LIMITS.MAX_MEMBER_BODY_LENGTH + 1);
      expect(await errorsOn(question(over), 'body')).toBe(true);
    });

    it('accepts a question up to that cap', async () => {
      const atLimit = chars(DISCUSSION_LIMITS.MAX_MEMBER_BODY_LENGTH);
      expect(await errorsOn(question(atLimit), 'body')).toBe(false);
    });
  });

  /**
   * The real ceiling is the 2 MB JSON body limit in main.ts, not this. Arabic is two
   * bytes per character in UTF-8, so a maximal answer is ~400 kB of body — this is the
   * arithmetic that has to keep holding if either number is ever changed again.
   */
  it('leaves room inside the 2 MB request limit, even in Arabic', () => {
    const worstCaseBytes = DISCUSSION_LIMITS.MAX_ADMIN_BODY_LENGTH * 2;
    expect(worstCaseBytes).toBeLessThan(2 * 1024 * 1024);
  });
});

/**
 * `isEssential` under the global pipe's `enableImplicitConversion`.
 *
 * That option coerces to the reflected type before validators run, and for a
 * boolean it turns ANY non-empty string into `true` — so a stray `"false"` would
 * silently mark an entry as one of The Essential Answers. The DTO reads the raw
 * value off `obj` to dodge it; these run with the same option the pipe uses, or
 * they would not be testing the thing that goes wrong.
 */
describe('isEssential coercion', () => {
  const IMPLICIT = { enableImplicitConversion: true } as const;
  const withFlag = (isEssential: unknown) =>
    plainToInstance(
      CreateEntryDto,
      {
        title: 'A question long enough to pass',
        answerBody: 'An answer long enough to pass',
        language: 'en',
        isEssential,
      },
      IMPLICIT,
    );

  it('accepts a real boolean, both ways round', async () => {
    const on = withFlag(true);
    const off = withFlag(false);
    expect(await validate(on)).toHaveLength(0);
    expect(await validate(off)).toHaveLength(0);
    expect(on.isEssential).toBe(true);
    expect(off.isEssential).toBe(false);
  });

  it('rejects the string "false" rather than storing it as true', async () => {
    expect(await errorsOn(withFlag('false'), 'isEssential')).toBe(true);
  });

  it('is optional — an entry need not say anything about it', async () => {
    expect(await errorsOn(withFlag(undefined), 'isEssential')).toBe(false);
  });
});
