import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * `sanitize-html` ships ESM only and this project's Jest runs CJS, so importing
 * the service pulls in scholarship-description, which pulls in sanitize-html,
 * and the suite dies at parse time on `export {`. Same wall dawah's discussions
 * spec hit, and the same way through it: the sanitiser lives in its own module
 * precisely so it can be replaced here.
 *
 * Identity functions rather than a fake cleaner. Nothing in this file is about
 * sanitising — these are status transitions — and a mock that pretended to strip
 * tags would invite an assertion that proves only that the mock works.
 *
 * The allowlist therefore has NO Jest coverage, and cannot have any while the
 * suite is CJS: a spec that imports it dies at parse time, which was checked
 * rather than assumed. It was verified against the real library through the
 * running API instead — a script tag, an onerror handler and a javascript: href
 * pushed through PATCH /admin/scholarship/programs, and the stored row read
 * back. Written down because "untested" and "unverified" are different claims.
 */
jest.mock('./scholarship-description', () => ({
  sanitizeDescription: (html: unknown) => html,
  sanitizeDescriptionI18n: (value: unknown) => value,
}));

import { ScholarshipService } from './scholarship.service';
import {
  ScholarshipApplication,
  ScholarshipApplicationStatus,
} from './entities/scholarship-application.entity';
import { ScholarshipStatusHistory } from './entities/scholarship-status-history.entity';
import {
  ScholarshipProgram,
  ScholarshipProgramStatus,
} from './entities/scholarship-program.entity';
import { ScholarshipDocument } from './entities/scholarship-document.entity';
import { ScholarshipStatusAction } from './dto/update-scholarship-status.dto';
import { User } from '../users/entities/user.entity';
import { District } from '../locations/entities/district.entity';

/**
 * The state rules on a scholarship application: who may change what, and when.
 *
 * Every case here is one a live system got wrong. The feature shipped with no
 * tests at all, and each of these was found by running the endpoint rather than
 * by reading it — an applicant attaching evidence to an application that had
 * already been confirmed, a reviewer able to reject a draft the applicant had
 * not finished writing, a duplicate check that disagreed with the unique index
 * underneath it and turned a refusal into a 500.
 *
 * They are grouped by the rule rather than by the method, because the rule is
 * the thing worth keeping.
 */
describe('ScholarshipService — state rules', () => {
  let service: ScholarshipService;
  let applications: Record<string, jest.Mock>;
  let programs: Record<string, jest.Mock>;
  let documents: Record<string, jest.Mock>;
  let history: Record<string, jest.Mock>;

  const APPLICANT = 'applicant-1';
  const ADMIN = 'admin-1';

  const makeApplication = (over: Partial<ScholarshipApplication> = {}): ScholarshipApplication =>
    ({
      id: 'app-1',
      applicantId: APPLICANT,
      programId: 'prog-1',
      status: ScholarshipApplicationStatus.DRAFT,
      fullNames: 'Aisha Uwimana',
      phone: '+250781000137',
      schoolName: 'GS Kigali Islamic',
      statusHistory: [],
      documents: [],
      ...over,
    }) as ScholarshipApplication;

  const makeProgram = (over: Partial<ScholarshipProgram> = {}): ScholarshipProgram =>
    ({
      id: 'prog-1',
      title: 'S4 bursary',
      status: ScholarshipProgramStatus.PUBLISHED,
      opensAt: null,
      deadline: null,
      ...over,
    }) as ScholarshipProgram;

  beforeEach(async () => {
    applications = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ ...d, id: 'app-new' })),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };
    programs = {
      findOne: jest.fn().mockResolvedValue(makeProgram()),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    documents = {
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    history = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScholarshipService,
        { provide: getRepositoryToken(ScholarshipApplication), useValue: applications },
        { provide: getRepositoryToken(ScholarshipStatusHistory), useValue: history },
        { provide: getRepositoryToken(ScholarshipProgram), useValue: programs },
        { provide: getRepositoryToken(ScholarshipDocument), useValue: documents },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        {
          provide: getRepositoryToken(District),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: getDataSourceToken(),
          useValue: { query: jest.fn().mockResolvedValue([{ seq: 42 }]) } as unknown as DataSource,
        },
      ],
    }).compile();

    service = module.get(ScholarshipService);
  });

  /**
   * Evidence is fixed when the text is.
   *
   * Ownership used to be the entire check, so this passed on a CONFIRMED
   * application — verified against the running server, not imagined.
   */
  describe('documents may only change while the application is a draft', () => {
    const NOT_DRAFT = [
      ScholarshipApplicationStatus.SUBMITTED,
      ScholarshipApplicationStatus.UNDER_REVIEW,
      ScholarshipApplicationStatus.APPROVED,
      ScholarshipApplicationStatus.CONFIRMED,
      ScholarshipApplicationStatus.REJECTED,
      ScholarshipApplicationStatus.CANCELLED,
    ];

    const dto = {
      documentType: 'transcript',
      fileKey: 'k',
      fileName: 'f.pdf',
      fileSize: 1,
      mimeType: 'application/pdf',
    } as never;

    it('lets a draft attach one — the wizard uploads before it submits', async () => {
      applications.findOne.mockResolvedValue(makeApplication());

      await expect(service.saveDocument('app-1', APPLICANT, dto)).resolves.toBeDefined();
      expect(documents.save).toHaveBeenCalled();
    });

    it.each(NOT_DRAFT)('refuses to attach one to a %s application', async (status) => {
      applications.findOne.mockResolvedValue(makeApplication({ status }));

      await expect(service.saveDocument('app-1', APPLICANT, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(documents.save).not.toHaveBeenCalled();
    });

    it.each(NOT_DRAFT)('refuses to remove one from a %s application', async (status) => {
      applications.findOne.mockResolvedValue(makeApplication({ status }));
      documents.findOne.mockResolvedValue({ id: 'doc-1' });

      await expect(service.deleteDocument('app-1', 'doc-1', APPLICANT)).rejects.toThrow(
        ForbiddenException,
      );
      expect(documents.remove).not.toHaveBeenCalled();
    });

    it('lets a draft remove one', async () => {
      applications.findOne.mockResolvedValue(makeApplication());
      documents.findOne.mockResolvedValue({ id: 'doc-1' });

      await service.deleteDocument('app-1', 'doc-1', APPLICANT);

      expect(documents.remove).toHaveBeenCalled();
    });

    // Ownership is still the first gate: the status rule must not have replaced
    // it, or another member's draft would be editable.
    it('still refuses a document on somebody else’s draft', async () => {
      applications.findOne.mockResolvedValue(makeApplication({ applicantId: 'someone-else' }));

      await expect(service.saveDocument('app-1', APPLICANT, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  /**
   * Rejection was the only admin action with no source-status check.
   */
  describe('rejection needs an application that is actually under consideration', () => {
    const reject = { action: ScholarshipStatusAction.REJECT, reason: 'Incomplete evidence' };

    it.each([
      ScholarshipApplicationStatus.SUBMITTED,
      ScholarshipApplicationStatus.UNDER_REVIEW,
      // An offer that has been made but not accepted can still be withdrawn.
      ScholarshipApplicationStatus.APPROVED,
    ])('rejects a %s application', async (status) => {
      applications.findOne.mockResolvedValue(makeApplication({ status }));

      const result = await service.adminUpdateStatus('app-1', ADMIN, reject);

      expect(result.status).toBe(ScholarshipApplicationStatus.REJECTED);
      expect(result.rejectionReason).toBe('Incomplete evidence');
    });

    it('refuses to reject a draft the applicant has not submitted', async () => {
      applications.findOne.mockResolvedValue(
        makeApplication({ status: ScholarshipApplicationStatus.DRAFT }),
      );

      await expect(service.adminUpdateStatus('app-1', ADMIN, reject)).rejects.toThrow(
        BadRequestException,
      );
    });

    it.each([
      // The applicant has taken the place up; this is not a board action.
      ScholarshipApplicationStatus.CONFIRMED,
      ScholarshipApplicationStatus.REJECTED,
      ScholarshipApplicationStatus.CANCELLED,
    ])('refuses to reject a %s application', async (status) => {
      applications.findOne.mockResolvedValue(makeApplication({ status }));

      await expect(service.adminUpdateStatus('app-1', ADMIN, reject)).rejects.toThrow(
        BadRequestException,
      );
    });

    // The reason rule is older than the status rule and must survive it.
    it('still demands a reason', async () => {
      applications.findOne.mockResolvedValue(
        makeApplication({ status: ScholarshipApplicationStatus.SUBMITTED }),
      );

      await expect(
        service.adminUpdateStatus('app-1', ADMIN, {
          action: ScholarshipStatusAction.REJECT,
          reason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // The other three actions kept their guards; a regression that loosened one
    // of them would otherwise be invisible here.
    it('still enforces the ordering of the other actions', async () => {
      applications.findOne.mockResolvedValue(
        makeApplication({ status: ScholarshipApplicationStatus.DRAFT }),
      );

      for (const action of [
        ScholarshipStatusAction.START_REVIEW,
        ScholarshipStatusAction.APPROVE,
        ScholarshipStatusAction.CONFIRM,
      ]) {
        await expect(service.adminUpdateStatus('app-1', ADMIN, { action })).rejects.toThrow(
          BadRequestException,
        );
      }
    });
  });

  /**
   * The duplicate check has to agree with `IDX_scholarship_app_one_per_program`,
   * which excludes exactly `cancelled` and `rejected`. When it did not, the row
   * reached Postgres and the applicant got a 500 instead of this message.
   */
  describe('one live application per scholarship', () => {
    const dto = {
      programId: 'prog-1',
      fullNames: 'Aisha Uwimana',
      phone: '+250781000137',
      schoolName: 'GS Kigali Islamic',
      educationLevel: 'secondary',
      currentYear: 'S4',
      guardianName: 'Uwimana (guardian)',
      guardianPhone: '+250781000138',
      relationship: 'parent',
      motivation: 'A motivation long enough to pass validation.',
    } as never;

    /**
     * Stands in for the database: returns the member's existing application only
     * when the service's own status filter would have selected it.
     *
     * Emulating the filter is the whole point. A mock that answers with a row
     * regardless of the query makes every case below pass no matter what
     * `ACTIVE_STATUSES` contains — which is exactly what the first version of
     * this spec did, and mutation testing is how that showed up: removing
     * `CONFIRMED` from the list broke only one test out of six that claimed to
     * cover it.
     */
    const existingApplicationWithStatus = (status: ScholarshipApplicationStatus) => {
      applications.findOne.mockImplementation(
        (query: { where: { status: { _value: string[] } } }) =>
          Promise.resolve(
            query.where.status._value.includes(status) ? makeApplication({ status }) : null,
          ),
      );
    };

    it.each([
      ScholarshipApplicationStatus.DRAFT,
      ScholarshipApplicationStatus.SUBMITTED,
      ScholarshipApplicationStatus.UNDER_REVIEW,
      ScholarshipApplicationStatus.APPROVED,
      ScholarshipApplicationStatus.CONFIRMED,
    ])('refuses a second application while one is %s', async (status) => {
      existingApplicationWithStatus(status);

      await expect(service.createDraft(APPLICANT, dto)).rejects.toThrow(ConflictException);
      expect(applications.save).not.toHaveBeenCalled();
    });

    /**
     * The statuses the index lets through must reach the insert, or the fix
     * would have been "block everything", which stops a rejected applicant from
     * ever applying again.
     */
    it.each([ScholarshipApplicationStatus.CANCELLED, ScholarshipApplicationStatus.REJECTED])(
      'allows a new application after a %s one',
      async (status) => {
        existingApplicationWithStatus(status);

        await expect(service.createDraft(APPLICANT, dto)).resolves.toBeDefined();
        expect(applications.save).toHaveBeenCalled();
      },
    );

    /**
     * Guards the alignment itself rather than its effect: this reads the status
     * list the service actually queries with, so widening or narrowing it
     * without touching the index fails here.
     */
    it('asks for exactly the statuses the unique index blocks', async () => {
      applications.findOne.mockResolvedValue(null);

      await service.createDraft(APPLICANT, dto);

      const where = applications.findOne.mock.calls[0][0].where;
      expect([...where.status._value].sort()).toEqual(
        ['approved', 'confirmed', 'draft', 'submitted', 'under_review'].sort(),
      );
    });
  });
});
