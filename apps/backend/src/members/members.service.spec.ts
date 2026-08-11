import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';

import { MembersService } from './members.service';
import { MemberProfile } from './entities/member-profile.entity';
import { User } from '../users/entities/user.entity';
import { RegisterMemberDto } from './dto/register-member.dto';

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

describe('MembersService', () => {
  let service: MembersService;
  let profiles: { findOne: jest.Mock; manager: { transaction: jest.Mock } };
  let txRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let txManager: { getRepository: jest.Mock; query: jest.Mock };

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
    profiles = {
      findOne: jest.fn().mockResolvedValue(null),
      manager: {
        transaction: jest.fn((cb: (m: typeof txManager) => Promise<unknown>) => cb(txManager)),
      },
    };

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
});
