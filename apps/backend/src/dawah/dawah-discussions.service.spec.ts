import { ForbiddenException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * `marked` ships ESM only, and this project's Jest runs CJS — importing the
 * service pulls in discussions-markdown, which pulls in marked, and the suite
 * dies at parse time on `export {`. That is why this service had no spec.
 *
 * Stubbed rather than worked around in the Jest config: none of these cases is
 * about rendering. They are status transitions, and the rendered HTML only
 * appears in the public projection they do not assert on. Markdown rendering
 * deserves its own tests against the real library, not a mock.
 */
const postExcerptMock = jest.fn(
  (src: string | null | undefined, _max?: number) => `excerpt:${src ?? ''}`,
);
jest.mock('./discussions-markdown', () => ({
  renderPostMarkdown: (src: string | null | undefined) => src ?? '',
  postExcerpt: (src: string | null | undefined, max?: number) => postExcerptMock(src, max),
}));

import { DawahDiscussionsService } from './dawah-discussions.service';
import { DawahQuestion } from './entities/dawah-question.entity';
import { DawahCategory } from './entities/dawah-category.entity';
import { DawahQuestionRating } from './entities/dawah-question-rating.entity';
import { DawahModerationLog } from './entities/dawah-moderation-log.entity';
import { EmailService } from '../integrations/email/email.service';
import { DISCUSSION_LIMITS } from './discussions.constants';
import type { User } from '../users/entities/user.entity';

/**
 * The admin half of Dawah discussions: answering a member's question, declining
 * one, and moderating what is already published.
 *
 * These are the transitions that decide what the public sees, and several of
 * them are one-way in practice — a rejected submission is not coming back
 * through the queue, and a deleted entry leaves only its moderation log. They
 * are also the paths with the least margin for a wrong status: `published`
 * without an answer is refused by a database CHECK constraint, so a service that
 * lets one through turns a reviewer's click into a 500.
 *
 * Notifications are fire-and-forget by design, so the email service is stubbed
 * and never asserted on: publishing an answer must succeed with SMTP down.
 */
describe('DawahDiscussionsService (admin)', () => {
  let service: DawahDiscussionsService;
  let questions: {
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    increment: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let ratings: { find: jest.Mock };
  let manager: { update: jest.Mock; insert: jest.Mock; softDelete: jest.Mock; restore: jest.Mock };
  let qb: Record<string, jest.Mock>;

  const admin = { id: 'admin-1', firstName: 'Amina', lastName: 'K' } as User;

  const makeQuestion = (over: Partial<DawahQuestion> = {}): DawahQuestion =>
    ({
      id: 'q-1',
      slug: 'a-question',
      title: 'A question',
      body: 'body',
      answerBody: null,
      status: 'pending',
      publishedAt: null,
      createdAt: new Date('2026-06-01'),
      ...over,
    }) as DawahQuestion;

  beforeEach(async () => {
    manager = {
      update: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue(undefined),
    };

    // Every builder method both adminList() and list() chain through. A missing one
    // fails as "x is not a function" rather than as a wrong result, so they are all
    // here even where a case does not assert on them.
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      // nextEntryNumber(): MAX over the table, soft-deleted rows included.
      withDeleted: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: 17 }),
    };

    questions = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
      // bySlug fires the view counter and does not await it.
      increment: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => qb),
    };
    ratings = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DawahDiscussionsService,
        { provide: getRepositoryToken(DawahQuestion), useValue: questions },
        { provide: getRepositoryToken(DawahCategory), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(DawahQuestionRating), useValue: ratings },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)) },
        },
        { provide: EmailService, useValue: { sendMail: jest.fn().mockResolvedValue(undefined) } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(DawahDiscussionsService);
    postExcerptMock.mockClear();
  });

  /** The final `update` payload the service wrote for a question. */
  const written = () => questions.update.mock.calls.at(-1)?.[1];

  describe('answerQuestion', () => {
    it('404s on a question that does not exist', async () => {
      questions.findOne.mockResolvedValue(null);

      await expect(
        service.answerQuestion(admin, 'nope', { answerBody: 'x' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    // Answering again would silently overwrite a published answer and re-stamp its
    // authorship. Editing is the deliberate path for that.
    it('409s rather than re-answering a published entry', async () => {
      questions.findOne.mockResolvedValue(makeQuestion({ status: 'published' }));

      await expect(
        service.answerQuestion(admin, 'q-1', { answerBody: 'x' } as never),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
      expect(questions.update).not.toHaveBeenCalled();
    });

    it('publishes the entry and records who answered it', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service.answerQuestion(admin, 'q-1', { answerBody: 'The answer' } as never);

      expect(written()).toMatchObject({
        answerBody: 'The answer',
        answeredById: 'admin-1',
        status: 'published',
      });
      expect(written().answeredAt).toBeInstanceOf(Date);
    });

    // An entry that was published, hidden, then answered again keeps the date it
    // first went live; re-stamping it would reorder the public list for no reason.
    it('keeps the original publication date when one already exists', async () => {
      const firstPublished = new Date('2026-01-01');
      questions.findOne.mockResolvedValue(
        makeQuestion({ status: 'hidden', publishedAt: firstPublished }),
      );

      await service.answerQuestion(admin, 'q-1', { answerBody: 'x' } as never);

      expect(written().publishedAt).toBe(firstPublished);
    });
  });

  describe('rejectQuestion', () => {
    it('409s on a published entry — those are hidden, not rejected', async () => {
      questions.findOne.mockResolvedValue(makeQuestion({ status: 'published' }));

      await expect(service.rejectQuestion(admin, 'q-1', 'off topic')).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
      });
    });

    it('marks it rejected and logs who declined it, with the reason', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      const result = await service.rejectQuestion(admin, 'q-1', 'already answered elsewhere');

      expect(result).toEqual({ id: 'q-1', status: 'rejected' });
      expect(manager.update).toHaveBeenCalledWith(DawahQuestion, 'q-1', { status: 'rejected' });
      expect(manager.insert).toHaveBeenCalledWith(
        DawahModerationLog,
        expect.objectContaining({
          moderatorId: 'admin-1',
          targetId: 'q-1',
          reason: 'already answered elsewhere',
        }),
      );
    });
  });

  describe('moderateQuestion', () => {
    it('hides a published entry', async () => {
      questions.findOne.mockResolvedValue(makeQuestion({ status: 'published', answerBody: 'a' }));

      const result = await service.moderateQuestion(admin, 'q-1', 'hide', 'withdrawn');

      expect(result).toEqual({ id: 'q-1', status: 'hidden' });
      expect(manager.softDelete).not.toHaveBeenCalled();
    });

    // Soft delete: gone from every view, but the row survives for audit.
    it('soft-deletes rather than removing the row', async () => {
      questions.findOne.mockResolvedValue(makeQuestion({ status: 'published', answerBody: 'a' }));

      await service.moderateQuestion(admin, 'q-1', 'delete', 'spam');

      expect(manager.update).toHaveBeenCalledWith(DawahQuestion, 'q-1', { status: 'deleted' });
      expect(manager.softDelete).toHaveBeenCalledWith(DawahQuestion, 'q-1');
    });

    it('restores a hidden entry that has an answer', async () => {
      questions.findOne.mockResolvedValue(makeQuestion({ status: 'hidden', answerBody: 'a' }));

      const result = await service.moderateQuestion(admin, 'q-1', 'restore', '');

      expect(result).toEqual({ id: 'q-1', status: 'published' });
      expect(manager.restore).toHaveBeenCalledWith(DawahQuestion, 'q-1');
    });

    // Without this the write reaches CHK_dawah_questions_published_has_answer and the
    // reviewer gets a 500 instead of a sentence telling them to answer it first.
    it('409s on restoring an entry that was never answered', async () => {
      questions.findOne.mockResolvedValue(makeQuestion({ status: 'pending', answerBody: undefined }));

      await expect(service.moderateQuestion(admin, 'q-1', 'restore', '')).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
      });
      expect(manager.update).not.toHaveBeenCalled();
    });

    // A moderator restoring a deleted entry has to be able to find it first.
    it('looks for soft-deleted rows too', async () => {
      questions.findOne.mockResolvedValue(makeQuestion({ answerBody: 'a' }));

      await service.moderateQuestion(admin, 'q-1', 'hide', '');

      expect(questions.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: true }),
      );
    });

    it('404s on an unknown entry', async () => {
      questions.findOne.mockResolvedValue(null);

      await expect(service.moderateQuestion(admin, 'nope', 'hide', '')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('adminList', () => {
    it('caps the page size, so a crafted limit cannot ask for the whole table', async () => {
      await service.adminList({ limit: 5000 });

      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('floors a nonsensical page and limit rather than computing a negative offset', async () => {
      await service.adminList({ page: -3, limit: 0 });

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(1);
    });

    it('offsets by the requested page', async () => {
      await service.adminList({ page: 3, limit: 20 });

      expect(qb.skip).toHaveBeenCalledWith(40);
    });

    it('filters by status only when one is given', async () => {
      await service.adminList({ status: 'pending' });
      expect(qb.andWhere).toHaveBeenCalledWith('q.status = :status', { status: 'pending' });

      qb.andWhere.mockClear();
      await service.adminList({});
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('reports the unpaged total alongside the page', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 137]);

      const result = await service.adminList({ page: 2, limit: 20 });

      expect(result).toMatchObject({ total: 137, page: 2, limit: 20 });
    });
  });

  // The asking side's spam guards. They are the reason the queue is worth working:
  // an unfiltered one fills with drive-by noise and stops being read.
  describe('submitQuestion guards', () => {
    const dto = { title: 'A real question here', body: 'A body long enough to pass' } as never;
    const userAged = (hours: number) =>
      ({
        id: 'u-1',
        createdAt: new Date(Date.now() - hours * 3_600_000),
      }) as User;

    it('refuses a brand-new account', async () => {
      await expect(
        service.submitQuestion(userAged(DISCUSSION_LIMITS.NEW_ACCOUNT_POST_DELAY_HOURS - 1), dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('429s once the hourly limit is reached', async () => {
      questions.count.mockResolvedValue(DISCUSSION_LIMITS.MAX_QUESTIONS_PER_HOUR);

      await expect(service.submitQuestion(userAged(48), dto)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    // Deleting your own spam must not reset the meter.
    it('counts soft-deleted questions toward the hourly limit', async () => {
      questions.count.mockResolvedValue(0);
      questions.findOne.mockResolvedValue(null);

      await service.submitQuestion(userAged(48), dto).catch(() => undefined);

      expect(questions.count).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: true }),
      );
    });

    it('409s on an exact resubmission of the previous question', async () => {
      questions.count.mockResolvedValue(0);
      questions.findOne.mockResolvedValue(
        makeQuestion({ title: 'A real question here', body: 'A body long enough to pass' }),
      );

      await expect(service.submitQuestion(userAged(48), dto)).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('summary', () => {
    it('persists an authored summary when creating an entry', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service
        .createEntry(admin, {
          title: 'A question about travel',
          body: 'A body long enough to pass',
          answerBody: 'An answer long enough to pass',
          summary: '  Yes, a traveller may combine.  ',
          language: 'en',
        } as never)
        .catch(() => undefined);

      expect(questions.create).toHaveBeenCalledWith(
        expect.objectContaining({ summary: 'Yes, a traveller may combine.' }),
      );
    });

    // Blanking it is a deliberate act — it returns the entry to the derived
    // excerpt — so it must store null rather than an empty string.
    it('stores null when the summary is cleared', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service.updateEntry('q-1', { summary: '   ' } as never);

      expect(written()).toMatchObject({ summary: null });
    });

    it('leaves the summary alone when the field is not sent', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service.updateEntry('q-1', { title: 'A new title entirely' } as never);

      expect(written()).not.toHaveProperty('summary');
    });

    it('accepts a summary written at the moment of answering', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service.answerQuestion(admin, 'q-1', {
        answerBody: 'The answer',
        summary: 'The short version',
      } as never);

      expect(written()).toMatchObject({ summary: 'The short version' });
    });

    // The listing must not carry the answers — that is the whole point of the
    // separate projection.
    it('omits the rendered question and answer from list rows', async () => {
      const row = makeQuestion({ status: 'published', answerBody: 'a', summary: 'The gist' });
      qb.getManyAndCount.mockResolvedValue([[row], 1]);

      const result = await service.list({} as never);

      expect(result.items[0]).toMatchObject({ summary: 'The gist' });
      expect(result.items[0]).not.toHaveProperty('bodyHtml');
      expect(result.items[0]).not.toHaveProperty('answerHtml');
    });

    it('falls back to an excerpt of the answer when no summary was authored', async () => {
      const row = makeQuestion({ status: 'published', answerBody: 'The full answer', summary: null });
      qb.getManyAndCount.mockResolvedValue([[row], 1]);

      await service.list({} as never);

      // Asserts the helper was CALLED with the answer — its output is stubbed,
      // because marked is ESM-only and cannot be loaded in this suite.
      expect(postExcerptMock).toHaveBeenCalledWith('The full answer', 300);
    });

    it('prefers the authored summary over the derived one', async () => {
      const row = makeQuestion({ status: 'published', answerBody: 'a', summary: 'Authored' });
      qb.getManyAndCount.mockResolvedValue([[row], 1]);

      await service.list({} as never);

      expect(postExcerptMock).not.toHaveBeenCalled();
    });
  });

  describe('public projections', () => {
    // A ruling carries RMC's authority, not an individual's. The name is not merely
    // hidden in the UI — it never leaves the server, so it cannot be read out of the
    // JSON payload either.
    it('never exposes who answered', async () => {
      const row = makeQuestion({ status: 'published', answerBody: 'a', summary: 'The gist' });
      qb.getManyAndCount.mockResolvedValue([[row], 1]);

      const result = await service.list({} as never);

      expect(result.items[0]).not.toHaveProperty('answeredBy');
    });

    it('still records WHEN it was answered', async () => {
      const answeredAt = new Date('2026-06-01');
      const row = makeQuestion({ status: 'published', answerBody: 'a', answeredAt });
      qb.getManyAndCount.mockResolvedValue([[row], 1]);

      const result = await service.list({} as never);

      expect(result.items[0]).toMatchObject({ answeredAt });
    });
  });

  describe('createEntry without question detail', () => {
    // The title IS the question on an admin-authored entry; the second box only
    // invited it to be typed twice. The column is NOT NULL, so an absent one must
    // become '' rather than reaching the database as undefined.
    it('stores an empty body when none is given', async () => {
      questions.findOne.mockResolvedValue(null);

      await service
        .createEntry(admin, {
          title: 'Can I combine prayers when travelling?',
          answerBody: 'An answer long enough to pass',
          language: 'en',
        } as never)
        .catch(() => undefined);

      expect(questions.create).toHaveBeenCalledWith(expect.objectContaining({ body: '' }));
    });

    it('still stores detail when it is supplied', async () => {
      questions.findOne.mockResolvedValue(null);

      await service
        .createEntry(admin, {
          title: 'A question about travel',
          body: 'The asker explained their situation',
          answerBody: 'An answer long enough to pass',
          language: 'en',
        } as never)
        .catch(() => undefined);

      expect(questions.create).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'The asker explained their situation' }),
      );
    });
  });

  describe('entry numbering', () => {
    it('assigns one past the highest ever used', async () => {
      questions.findOne.mockResolvedValue(null);

      await service
        .createEntry(admin, {
          title: 'A question long enough to pass',
          answerBody: 'An answer long enough to pass',
          language: 'en',
        } as never)
        .catch(() => undefined);

      expect(questions.create).toHaveBeenCalledWith(
        expect.objectContaining({ entryNumber: 18 }),
      );
    });

    it('starts at 1 on an empty table', async () => {
      qb.getRawOne.mockResolvedValue({ max: null });
      questions.findOne.mockResolvedValue(null);

      await service
        .createEntry(admin, {
          title: 'A question long enough to pass',
          answerBody: 'An answer long enough to pass',
          language: 'en',
        } as never)
        .catch(() => undefined);

      expect(questions.create).toHaveBeenCalledWith(expect.objectContaining({ entryNumber: 1 }));
    });

    // Numbering by how many rows are VISIBLE would re-issue a number the moment
    // anything is deleted. Gaps are correct; collisions are not.
    it('counts soft-deleted rows, so a number is never reused', async () => {
      questions.findOne.mockResolvedValue(null);

      await service.peekNextEntryNumber();

      expect(qb.withDeleted).toHaveBeenCalled();
    });

    // Two admins saving at the same instant read the same MAX; one loses on the
    // unique index. The retry has to RE-READ rather than reuse the value that
    // just failed, or it fails five times with the same number.
    it('re-reads the number when the insert collides', async () => {
      questions.findOne.mockResolvedValue(null);
      qb.getRawOne
        .mockResolvedValueOnce({ max: 17 })
        .mockResolvedValueOnce({ max: 18 });
      questions.save = jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }))
        .mockImplementation((d) => Promise.resolve(d));

      await service
        .createEntry(admin, {
          title: 'A question long enough to pass',
          answerBody: 'An answer long enough to pass',
          language: 'en',
        } as never)
        .catch(() => undefined);

      const numbers = questions.create.mock.calls.map((c) => c[0].entryNumber);
      expect(numbers).toEqual([18, 19]);
    });

    it('reports the next number without consuming it', async () => {
      expect(await service.peekNextEntryNumber()).toEqual({ nextEntryNumber: 18 });
      expect(questions.create).not.toHaveBeenCalled();
    });

    // Admin-facing only: the reading order is still newest-first.
    it('never reaches a public projection', async () => {
      const row = makeQuestion({ status: 'published', answerBody: 'a', entryNumber: 7 });
      qb.getManyAndCount.mockResolvedValue([[row], 1]);

      const result = await service.list({} as never);

      expect(result.items[0]).not.toHaveProperty('entryNumber');
    });
  });

  describe('the essential flag', () => {
    it('defaults to false — nothing is curated until somebody says so', async () => {
      questions.findOne.mockResolvedValue(null);

      await service
        .createEntry(admin, {
          title: 'A question long enough to pass',
          answerBody: 'An answer long enough to pass',
          language: 'en',
        } as never)
        .catch(() => undefined);

      expect(questions.create).toHaveBeenCalledWith(
        expect.objectContaining({ isEssential: false }),
      );
    });

    it('stores it when the entry is curated', async () => {
      questions.findOne.mockResolvedValue(null);

      await service
        .createEntry(admin, {
          title: 'A question long enough to pass',
          answerBody: 'An answer long enough to pass',
          language: 'en',
          isEssential: true,
        } as never)
        .catch(() => undefined);

      expect(questions.create).toHaveBeenCalledWith(
        expect.objectContaining({ isEssential: true }),
      );
    });

    it('can be turned off again', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service.updateEntry('q-1', { isEssential: false } as never);

      expect(written()).toMatchObject({ isEssential: false });
    });

    it('is left alone when the field is not sent', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service.updateEntry('q-1', { title: 'A new title entirely' } as never);

      expect(written()).not.toHaveProperty('isEssential');
    });

    it('narrows the public listing when asked for', async () => {
      await service.list({ essential: 'true' } as never);

      expect(qb.andWhere).toHaveBeenCalledWith('q.isEssential = true');
    });

    // `essential=false` means "do not restrict", not "show the un-curated ones".
    // Reading it as a filter would make absence and negation behave differently.
    it('does not narrow for anything other than "true"', async () => {
      await service.list({ essential: 'false' } as never);
      expect(qb.andWhere).not.toHaveBeenCalledWith('q.isEssential = true');

      qb.andWhere.mockClear();
      await service.list({} as never);
      expect(qb.andWhere).not.toHaveBeenCalledWith('q.isEssential = true');
    });
  });

  describe('the popular sort', () => {
    it('orders by views, most read first', async () => {
      await service.list({ sort: 'popular' } as never);

      expect(qb.orderBy).toHaveBeenCalledWith('q.viewCount', 'DESC');
    });

    // Every unread entry shares a count of 0, and without a second key Postgres may
    // return those in any order — so the tail would reshuffle between two identical
    // requests, and paginating over it would repeat some rows and skip others.
    it('breaks ties on recency, so the order is stable', async () => {
      await service.list({ sort: 'popular' } as never);

      expect(qb.addOrderBy).toHaveBeenCalledWith('q.publishedAt', 'DESC');
    });

    it('leaves the default listing in publication order', async () => {
      await service.list({} as never);

      expect(qb.orderBy).toHaveBeenCalledWith('q.publishedAt', 'DESC');
      expect(qb.orderBy).not.toHaveBeenCalledWith('q.viewCount', 'DESC');
    });

    // A search has its own ordering — relevance — and asking for popularity must not
    // quietly override it, or a keyword match would be buried under whatever is read most.
    it('does not override relevance when there is a search term', async () => {
      await service.list({ sort: 'popular', search: 'prayer' } as never);

      expect(qb.orderBy).toHaveBeenCalledWith('rank', 'DESC');
      expect(qb.orderBy).not.toHaveBeenCalledWith('q.viewCount', 'DESC');
    });
  });

  describe('the answer summary', () => {
    it('persists it when creating an entry', async () => {
      questions.findOne.mockResolvedValue(null);

      await service
        .createEntry(admin, {
          title: 'A question long enough to pass',
          answerBody: 'An answer long enough to pass',
          answerSummary: '  Yes, a traveller may combine.  ',
          language: 'en',
        } as never)
        .catch(() => undefined);

      expect(questions.create).toHaveBeenCalledWith(
        expect.objectContaining({ answerSummary: 'Yes, a traveller may combine.' }),
      );
    });

    it('accepts one written at the moment of answering', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service.answerQuestion(admin, 'q-1', {
        answerBody: 'The answer',
        answerSummary: 'The short version',
      } as never);

      expect(written()).toMatchObject({ answerSummary: 'The short version' });
    });

    it('stores null when cleared', async () => {
      questions.findOne.mockResolvedValue(makeQuestion());

      await service.updateEntry('q-1', { answerSummary: '   ' } as never);

      expect(written()).toMatchObject({ answerSummary: null });
    });

    // Absent means absent. A derived one would repeat the listing lede a few lines
    // above itself, which is why `summary` has a fallback and this does not.
    it('is null on the entry when nobody wrote one — never derived', async () => {
      const row = makeQuestion({
        status: 'published',
        answerBody: 'The full answer',
        answerSummary: null,
      });
      questions.findOne.mockResolvedValue(row);

      const result = await service.bySlug('a-question');

      expect(result.answerSummary).toBeNull();
    });

    // The listing has `summary` for this job; shipping both would send the same
    // idea twice to a card that renders one of them.
    it('stays off the listing rows', async () => {
      const row = makeQuestion({ status: 'published', answerSummary: 'Short' });
      qb.getManyAndCount.mockResolvedValue([[row], 1]);

      const result = await service.list({} as never);

      expect(result.items[0]).not.toHaveProperty('answerSummary');
    });
  });
});
