import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { Permission } from '../common/types/permissions.enum';

const makeRole = (overrides: Partial<Role> = {}): Role =>
  Object.assign(new Role(), {
    id: 'role-uuid-1',
    name: 'Test Role',
    slug: 'test_role',
    description: 'A test role',
    permissions: [Permission.MEMBERS_VIEW],
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('RolesService', () => {
  let service: RolesService;
  let repo: jest.Mocked<Repository<Role>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((d) => Object.assign(new Role(), d)),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RolesService);
    repo = module.get(getRepositoryToken(Role));
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  it('findAll returns all roles ordered by name', async () => {
    const roles = [makeRole({ name: 'A' }), makeRole({ name: 'B', id: 'r2' })];
    repo.find.mockResolvedValue(roles);
    expect(await service.findAll()).toBe(roles);
    expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  it('findById returns null when not found', async () => {
    repo.findOne.mockResolvedValue(null);
    expect(await service.findById('no-id')).toBeNull();
  });

  it('findById returns role when found', async () => {
    const role = makeRole();
    repo.findOne.mockResolvedValue(role);
    expect(await service.findById('role-uuid-1')).toBe(role);
  });

  // ── findByIdOrFail ────────────────────────────────────────────────────────

  it('findByIdOrFail throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findByIdOrFail('bad-id')).rejects.toThrow(NotFoundException);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('create saves a new role successfully', async () => {
    repo.findOne.mockResolvedValue(null);
    const saved = makeRole();
    repo.save.mockResolvedValue(saved);

    const result = await service.create({
      name: 'Test Role',
      slug: 'test_role',
      description: 'desc',
      permissions: [Permission.MEMBERS_VIEW],
    });

    expect(repo.save).toHaveBeenCalled();
    expect(result).toBe(saved);
  });

  it('create throws ConflictException when name/slug already exists', async () => {
    repo.findOne.mockResolvedValue(makeRole());
    await expect(
      service.create({ name: 'Test Role', slug: 'test_role', permissions: [] }),
    ).rejects.toThrow(ConflictException);
  });

  // ── update ────────────────────────────────────────────────────────────────

  it('update changes permissions on a custom role', async () => {
    const role = makeRole({ permissions: [] });
    repo.findOne.mockResolvedValue(role);
    repo.save.mockImplementation(async (r) => r as Role);

    const updated = await service.update('role-uuid-1', {
      permissions: [Permission.CONTENT_VIEW, Permission.CONTENT_EDIT],
    });

    expect(updated.permissions).toEqual([Permission.CONTENT_VIEW, Permission.CONTENT_EDIT]);
  });

  it('update throws BadRequestException when changing name of a system role', async () => {
    const systemRole = makeRole({ isSystem: true });
    repo.findOne.mockResolvedValue(systemRole);
    await expect(service.update('role-uuid-1', { name: 'New Name' })).rejects.toThrow(
      BadRequestException,
    );
  });

  // ── remove ────────────────────────────────────────────────────────────────

  it('remove deletes a non-system role', async () => {
    const role = makeRole({ isSystem: false });
    repo.findOne.mockResolvedValue(role);
    repo.remove.mockResolvedValue(role);
    await service.remove('role-uuid-1');
    expect(repo.remove).toHaveBeenCalledWith(role);
  });

  it('remove throws BadRequestException for system roles', async () => {
    repo.findOne.mockResolvedValue(makeRole({ isSystem: true }));
    await expect(service.remove('role-uuid-1')).rejects.toThrow(BadRequestException);
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
