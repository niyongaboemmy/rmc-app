import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

const makeUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: 'user-uuid-1',
    email: 'test@rmc.org.rw',
    phone: '+250788000001',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    roleId: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

describe('UsersService', () => {
  let service: UsersService;
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    softDelete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
    };

    repo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      create: jest.fn((d) => Object.assign(new User(), d)),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    configService = { get: jest.fn().mockReturnValue(12) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  // ── findByEmail ───────────────────────────────────────────────────────────

  it('findByEmail returns null for unknown email', async () => {
    repo.findOne.mockResolvedValue(null);
    expect(await service.findByEmail('no@no.com')).toBeNull();
  });

  it('findByEmail returns user for known email', async () => {
    const user = makeUser();
    repo.findOne.mockResolvedValue(user);
    expect(await service.findByEmail('test@rmc.org.rw')).toBe(user);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('create throws ConflictException when email already exists', async () => {
    repo.findOne.mockResolvedValueOnce(makeUser()).mockResolvedValueOnce(null);
    await expect(
      service.create({
        email: 'taken@rmc.org.rw',
        phone: '+250788000099',
        password: 'Test@1234',
        firstName: 'A',
        lastName: 'B',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('create throws ConflictException when phone already exists', async () => {
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeUser());
    await expect(
      service.create({
        email: 'new@rmc.org.rw',
        phone: '+250788000001',
        password: 'Test@1234',
        firstName: 'A',
        lastName: 'B',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('create saves user with hashed password and defaults', async () => {
    repo.findOne.mockResolvedValue(null);
    const saved = makeUser({ role: 'user', status: 'active' });
    repo.save.mockResolvedValue(saved);

    const result = await service.create({
      email: 'new@rmc.org.rw',
      phone: '+250788000002',
      password: 'Test@1234',
      firstName: 'New',
      lastName: 'User',
    });

    expect(repo.save).toHaveBeenCalled();
    const savedArg = repo.save.mock.calls[0][0] as User;
    expect(savedArg.role).toBe('user');
    expect(savedArg.status).toBe('active');
    expect(savedArg.passwordHash).not.toBe('Test@1234'); // hashed
    expect(result).toBe(saved);
  });

  // ── updateProfile ─────────────────────────────────────────────────────────

  it('updateProfile throws NotFoundException when user not found', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.updateProfile('bad-id', { firstName: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateProfile updates firstName and lastName', async () => {
    const user = makeUser();
    repo.findOne.mockResolvedValue(user);
    repo.save.mockImplementation(async (u) => u as User);

    const updated = await service.updateProfile('user-uuid-1', {
      firstName: 'Updated',
      lastName: 'Name',
    });

    expect(updated.firstName).toBe('Updated');
    expect(updated.lastName).toBe('Name');
  });

  // ── assignRole ────────────────────────────────────────────────────────────

  it('assignRole throws NotFoundException for unknown user', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.assignRole('bad-id', { role: 'admin' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('assignRole sets role and roleId', async () => {
    const user = makeUser({ role: 'user', roleId: null });
    repo.findOne.mockResolvedValue(user);
    repo.save.mockImplementation(async (u) => u as User);

    const result = await service.assignRole('user-uuid-1', {
      role: 'admin',
      roleId: 'role-uuid-admin',
    });

    expect(result.role).toBe('admin');
    expect(result.roleId).toBe('role-uuid-admin');
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  it('softDelete throws NotFoundException for unknown user', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.softDelete('bad-id')).rejects.toThrow(NotFoundException);
  });

  it('softDelete calls repository softDelete', async () => {
    repo.findOne.mockResolvedValue(makeUser());
    repo.softDelete.mockResolvedValue({ affected: 1 });
    await service.softDelete('user-uuid-1');
    expect(repo.softDelete).toHaveBeenCalledWith('user-uuid-1');
  });
});
