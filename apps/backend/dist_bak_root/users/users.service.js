"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const config_1 = require("@nestjs/config");
const user_entity_1 = require("./entities/user.entity");
let UsersService = class UsersService {
    constructor(userRepo, configService) {
        this.userRepo = userRepo;
        this.configService = configService;
    }
    async findById(id) {
        return this.userRepo.findOne({ where: { id }, relations: ['roleEntity'] });
    }
    async findByIdRaw(id) {
        return this.userRepo.findOne({ where: { id } });
    }
    async findByEmail(email) {
        return this.userRepo.findOne({ where: { email: email.toLowerCase() } });
    }
    async findByPhone(phone) {
        return this.userRepo.findOne({ where: { phone } });
    }
    async findByEmailOrPhone(identifier) {
        return this.userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.roleEntity', 'role')
            .where('LOWER(user.email) = LOWER(:identifier)', { identifier })
            .orWhere('user.phone = :identifier', { identifier })
            .getOne();
    }
    async findAll(query) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 20));
        const qb = this.userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.roleEntity', 'role');
        if (query.search) {
            qb.andWhere('(LOWER(user.firstName) LIKE :q OR LOWER(user.lastName) LIKE :q OR LOWER(user.email) LIKE :q OR user.phone LIKE :q)', { q: `%${query.search.toLowerCase()}%` });
        }
        if (query.role)
            qb.andWhere('user.role = :role', { role: query.role });
        if (query.status)
            qb.andWhere('user.status = :status', { status: query.status });
        const [users, total] = await qb
            .orderBy('user.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { users, total };
    }
    async create(dto) {
        const [existingEmail, existingPhone] = await Promise.all([
            this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } }),
            this.userRepo.findOne({ where: { phone: dto.phone } }),
        ]);
        if (existingEmail)
            throw new common_1.ConflictException('Email already registered');
        if (existingPhone)
            throw new common_1.ConflictException('Phone already registered');
        const rounds = this.configService.get('app.bcryptRounds', 12);
        const passwordHash = await bcrypt.hash(dto.password, rounds);
        return this.userRepo.save(this.userRepo.create({
            email: dto.email.toLowerCase(),
            phone: dto.phone,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            gender: dto.gender ?? null,
            role: dto.role ?? 'user',
            roleId: dto.roleId ?? null,
            status: 'active',
        }));
    }
    async updateProfile(id, dto) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
            const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
            if (existing)
                throw new common_1.ConflictException('Email already in use by another account');
        }
        let normalizedPhone;
        if (dto.phone) {
            normalizedPhone = dto.phone.startsWith('07')
                ? `+250${dto.phone.slice(1)}`
                : dto.phone;
            if (normalizedPhone !== user.phone) {
                const existing = await this.userRepo.findOne({ where: { phone: normalizedPhone } });
                if (existing)
                    throw new common_1.ConflictException('Phone number already in use by another account');
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
    async assignRole(id, dto) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (dto.roleId !== undefined)
            user.roleId = dto.roleId;
        if (dto.role)
            user.role = dto.role;
        return this.userRepo.save(user);
    }
    async save(user) {
        return this.userRepo.save(user);
    }
    async update(id, data) {
        await this.userRepo.update(id, data);
    }
    async softDelete(id) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.userRepo.softDelete(id);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], UsersService);
//# sourceMappingURL=users.service.js.map