import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException } from '@nestjs/common';

import { MembersService } from './members.service';
import { MemberProfile, ApprovalStatus } from './entities/member-profile.entity';
import { User } from '../users/entities/user.entity';
import { RegisterMemberDto } from './dto/register-member.dto';
import { ApprovalAction } from './dto/approve-member.dto';

const dto = (over: Partial<RegisterMemberDto> = {}): RegisterMemberDto =>
  ({ consentGiven: true, nationalId: '1199012345678901', ...over }) as RegisterMemberDto;

/** The stub row signup creates: a reserved number and nothing else filled in. */
const stub = (over: Partial<MemberProfile> = {}): MemberProfile =>
  ({
    id: 'profile-1',
    userId: 'user-1',
    membershipNumber: 'RMC-2026-000007',
    joinedDate: new Date('2026-01-02'),
    registeredAt: null,
    ...over,
  }) as MemberProfile;

type Mocked = Record<string, jest.Mock>;

describe('MembersService', () => {
  let service: MembersService;
  let profiles: Mocked & { manager: { transaction: jest.Mock } };
  let txRepo: Mocked;
  let txManager: { getRepository: jest.Mock; query: jest.Mock };
  let qb: Mocked;

  beforeEach(async () => {
    // register() writes through the transaction's EntityManager, so the fake
    // manager routes getRepository() to the mock the tests assert on and query()
    // stands in for the membership_counters upsert.
    txRepo = {
      findOne: jest.fn(),
      create: jest.fn((v: Partial<MemberProfile>) => ({ ...v })),
      save: jest.fn((v: MemberProfile) => Promise.resolve(v)),
    };
    txManager = {
      getRepository: jest.fn(() => txRepo),
      query: jest.fn().mockResolvedValue([{ last_seq: 42 }]),
    };
    // Chainable query-builder stub; findAll() is asserted on the WHERE fragments
    // it adds, which is where the registration filter lives.
    qb = {
      leftJoinAndSelect: jest.fn(() => qb),
      skip: jest.fn(() => qb),
      take: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    profiles = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((v: MemberProfile) => Promise.resolve(v)),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => qb),
      manager: {
        transaction: jest.fn((cb: (m: typeof txManager) => Promise<unknown>) => cb(txManager)),
      },
    } as unknown as Mocked & { manager: { transaction: jest.Mock } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getRepositoryToken(MemberProfile), useValue: profiles },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  describe('register', () => {
    // The regression this whole change exists for: signup creates a profile for
    // every user, and treating that as prior registration made the endpoint
    // return 409 for absolutely everybody.
    it('fills in the stub signup created instead of rejecting it', async () => {
      txRepo.findOne.mockResolvedValue(stub());

      const result = await service.register('user-1', dto({ occupation: 'Teacher' }));

      expect(result.occupation).toBe('Teacher');
      expect(result.registeredAt).toBeInstanceOf(Date);
    });

    it('keeps the membership number allocated at signup', async () => {
      txRepo.findOne.mockResolvedValue(stub());

      const result = await service.register('user-1', dto());

      expect(result.membershipNumber).toBe('RMC-2026-000007');
      // No second number drawn — the counter is never touched on this path.
      expect(txManager.query).not.toHaveBeenCalled();
    });

    it('rejects a second submission once registered_at is stamped', async () => {
      txRepo.findOne.mockResolvedValue(stub({ registeredAt: new Date('2026-02-01') }));

      await expect(service.register('user-1', dto())).rejects.toBeInstanceOf(ConflictException);
      expect(txRepo.save).not.toHaveBeenCalled();
    });

    it('allocates from the counter for legacy accounts with no profile', async () => {
      txRepo.findOne.mockResolvedValue(null);

      const result = await service.register('user-1', dto());

      expect(txManager.query).toHaveBeenCalledWith(
        expect.stringContaining('membership_counters'),
        [new Date().getFullYear()],
      );
      expect(result.membershipNumber).toBe(`RMC-${new Date().getFullYear()}-000042`);
    });

    it("rejects a national ID already held by someone else", async () => {
      profiles.findOne.mockResolvedValue({ userId: 'someone-else' });

      await expect(service.register('user-1', dto())).rejects.toBeInstanceOf(ConflictException);
    });

    // The member's own stub carries their national ID on a resubmission attempt;
    // matching it against themselves must not read as a conflict.
    it('does not treat the member own national ID as a conflict', async () => {
      profiles.findOne.mockResolvedValue({ userId: 'user-1' });
      txRepo.findOne.mockResolvedValue(stub());

      await expect(service.register('user-1', dto())).resolves.toBeDefined();
    });

    it('leaves consentDate null when consent is withheld', async () => {
      txRepo.findOne.mockResolvedValue(stub());

      const result = await service.register('user-1', dto({ consentGiven: false }));

      expect(result.consentDate).toBeNull();
      expect(result.registeredAt).toBeInstanceOf(Date);
    });
  });

  describe('approve', () => {
    // Stubs are `pending` exactly like real applicants, so the admin list showed
    // an Approve button for people who had never submitted anything.
    it('refuses to approve a member who never submitted a registration', async () => {
      profiles.findOne.mockResolvedValue(
        stub({ registeredAt: null, approvalStatus: ApprovalStatus.PENDING }),
      );

      await expect(
        service.approve('profile-1', 'admin-1', { action: ApprovalAction.APPROVE }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(profiles.save).not.toHaveBeenCalled();
    });

    it('approves a member who did submit', async () => {
      profiles.findOne.mockResolvedValue(
        stub({ registeredAt: new Date('2026-02-01'), approvalStatus: ApprovalStatus.PENDING }),
      );

      const result = await service.approve('profile-1', 'admin-1', {
        action: ApprovalAction.APPROVE,
      });

      expect(result.approvalStatus).toBe(ApprovalStatus.APPROVED);
      expect(result.approvedBy).toBe('admin-1');
    });
  });

  describe('findAll', () => {
    const whereClauses = (): string[] =>
      qb.andWhere.mock.calls.map((c: unknown[]) => String(c[0]));

    it('lists only submitted registrations by default', async () => {
      await service.findAll({});
      expect(whereClauses()).toContain('mp.registered_at IS NOT NULL');
    });

    it('lists only the signup stubs when asked for unregistered', async () => {
      await service.findAll({ registrationState: 'unregistered' });
      expect(whereClauses()).toContain('mp.registered_at IS NULL');
    });

    it('applies no registration filter for "all"', async () => {
      await service.findAll({ registrationState: 'all' });
      expect(whereClauses().filter((c) => c.includes('registered_at'))).toHaveLength(0);
    });

    // A bad query param must not silently widen the list to every account.
    it('falls back to registered for an unrecognised value', async () => {
      await service.findAll({ registrationState: 'nonsense' as 'all' });
      expect(whereClauses()).toContain('mp.registered_at IS NOT NULL');
    });
  });

  describe('getStatistics', () => {
    it('reports the stubs separately instead of counting them as members', async () => {
      profiles.count
        .mockResolvedValueOnce(10) // total registered
        .mockResolvedValueOnce(4) // approved
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(2) // rejected
        .mockResolvedValueOnce(7); // unregistered stubs

      await expect(service.getStatistics()).resolves.toEqual({
        total: 10,
        approved: 4,
        pending: 3,
        rejected: 2,
        unregistered: 7,
      });
    });

    // Every count must be scoped on registered_at — otherwise `total` is a count
    // of user accounts and `pending` includes people who never applied.
    it('scopes every count on registration state', async () => {
      await service.getStatistics();

      const wheres = profiles.count.mock.calls.map(
        (c: unknown[]) => (c[0] as { where?: Record<string, unknown> })?.where,
      );
      expect(wheres).toHaveLength(5);
      expect(wheres.every((w) => w && 'registeredAt' in w)).toBe(true);
    });
  });
});
