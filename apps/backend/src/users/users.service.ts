import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, AssignRoleDto } from './dto/update-user.dto';

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id }, relations: ['roleEntity'] });
  }

  async findByIdRaw(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phone } });
  }

  async findByEmailOrPhone(identifier: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleEntity', 'role')
      .where('LOWER(user.email) = LOWER(:identifier)', { identifier })
      .orWhere('user.phone = :identifier', { identifier })
      .getOne();
  }

  async findAll(query: UserListQuery): Promise<{ users: User[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleEntity', 'role');

    if (query.search) {
      qb.andWhere(
        '(LOWER(user.firstName) LIKE :q OR LOWER(user.lastName) LIKE :q OR LOWER(user.email) LIKE :q OR user.phone LIKE :q)',
        { q: `%${query.search.toLowerCase()}%` },
      );
    }
    if (query.role) qb.andWhere('user.role = :role', { role: query.role });
    if (query.status) qb.andWhere('user.status = :status', { status: query.status });

    const [users, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase();

    // `withDeleted: true` is essential: the DB unique constraints on email/phone
    // still count soft-deleted rows, so a lookup that hides them (TypeORM's
    // default) would pass this guard and then blow up on INSERT with a raw 500.
    const [byEmail, byPhone] = await Promise.all([
      this.userRepo.findOne({ where: { email }, withDeleted: true }),
      this.userRepo.findOne({ where: { phone: dto.phone }, withDeleted: true }),
    ]);

    // An active account already owns the email/phone → genuine conflict.
    if (byEmail && !byEmail.deletedAt) throw new ConflictException('Email already registered');
    if (byPhone && !byPhone.deletedAt) throw new ConflictException('Phone already registered');

    // Otherwise any match is a soft-deleted account. The email is a unique
    // identity, so it can't be reused for a brand-new row — revive the deleted
    // account and overwrite it with the new details instead. If email and phone
    // point at two *different* deleted accounts we can't merge them.
    if (byEmail && byPhone && byEmail.id !== byPhone.id) {
      throw new ConflictException('Email and phone belong to two different deleted accounts');
    }
    const revive = byEmail ?? byPhone ?? null;

    const rounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const data = {
      email,
      phone: dto.phone,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      gender: dto.gender ?? null,
      role: dto.role ?? 'user',
      roleId: dto.roleId ?? null,
      status: 'active',
    };

    try {
      if (revive) {
        await this.userRepo.restore(revive.id); // clear deleted_at
        await this.userRepo.update(revive.id, data);
        return (await this.userRepo.findOne({ where: { id: revive.id } }))!;
      }
      return await this.userRepo.save(this.userRepo.create(data));
    } catch (err: unknown) {
      // Safety net for races / any duplicate we didn't pre-catch: Postgres
      // unique_violation (23505) → clean 409 instead of a 500.
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictException('Email or phone already registered');
      }
      throw err;
    }
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Email uniqueness check (include soft-deleted rows — the DB constraint does)
    if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() }, withDeleted: true });
      if (existing) throw new ConflictException('Email already in use by another account');
    }

    // Phone normalization + uniqueness check (include soft-deleted rows)
    let normalizedPhone: string | undefined;
    if (dto.phone) {
      normalizedPhone = dto.phone.startsWith('07') ? `+250${dto.phone.slice(1)}` : dto.phone;
      if (normalizedPhone !== user.phone) {
        const existing = await this.userRepo.findOne({ where: { phone: normalizedPhone }, withDeleted: true });
        if (existing) throw new ConflictException('Phone number already in use by another account');
      }
    }

    Object.assign(user, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
      ...(dto.gender && { gender: dto.gender }),
      ...(dto.status && { status: dto.status }),
      ...(dto.email && { email: dto.email.toLowerCase(), isEmailVerified: false }),
      ...(normalizedPhone && { phone: normalizedPhone, isPhoneVerified: false }),
      ...(dto.profilePhotoUrl !== undefined && { profilePhotoUrl: dto.profilePhotoUrl || null }),
    });
    return this.userRepo.save(user);
  }

  async assignRole(id: string, dto: AssignRoleDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (dto.roleId !== undefined) user.roleId = dto.roleId;
    if (dto.role) user.role = dto.role;
    return this.userRepo.save(user);
  }

  async save(user: Partial<User>): Promise<User> {
    return this.userRepo.save(user as User);
  }

  async update(id: string, data: Partial<User>): Promise<void> {
    await this.userRepo.update(id, data as Partial<User>);
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.softDelete(id);
  }
}
