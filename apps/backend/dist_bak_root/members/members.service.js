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
exports.MembersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const QRCode = require("qrcode");
const pdf_lib_1 = require("pdf-lib");
const member_profile_entity_1 = require("./entities/member-profile.entity");
const user_entity_1 = require("../users/entities/user.entity");
const approve_member_dto_1 = require("./dto/approve-member.dto");
let MembersService = class MembersService {
    constructor(profiles, users) {
        this.profiles = profiles;
        this.users = users;
    }
    generateMembershipNumber() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 90000) + 10000;
        return `RMC-${year}-${random}`;
    }
    async register(userId, dto) {
        const existing = await this.profiles.findOne({ where: { userId } });
        if (existing)
            throw new common_1.ConflictException('Member profile already exists for this user');
        if (dto.nationalId) {
            const nationalIdConflict = await this.profiles.findOne({ where: { nationalId: dto.nationalId } });
            if (nationalIdConflict)
                throw new common_1.ConflictException('National ID already registered');
        }
        let membershipNumber = this.generateMembershipNumber();
        while (await this.profiles.findOne({ where: { membershipNumber } })) {
            membershipNumber = this.generateMembershipNumber();
        }
        const profile = this.profiles.create({
            userId,
            membershipNumber,
            joinedDate: new Date(),
            consentDate: dto.consentGiven ? new Date() : null,
            approvalStatus: member_profile_entity_1.ApprovalStatus.PENDING,
            memberStatus: member_profile_entity_1.MemberStatus.ACTIVE,
            ...dto,
        });
        return this.profiles.save(profile);
    }
    async findAll(filters) {
        const page = filters.page ?? 1;
        const limit = Math.min(filters.limit ?? 50, 100);
        const skip = (page - 1) * limit;
        const qb = this.profiles.createQueryBuilder('mp')
            .leftJoinAndSelect('mp.user', 'u')
            .skip(skip)
            .take(limit)
            .orderBy('mp.createdAt', 'DESC');
        if (filters.search) {
            qb.andWhere('(u.first_name ILIKE :s OR u.last_name ILIKE :s OR u.email ILIKE :s OR mp.membership_number ILIKE :s OR mp.national_id ILIKE :s)', { s: `%${filters.search}%` });
        }
        if (filters.mosqueId)
            qb.andWhere('mp.mosque_id = :mosqueId', { mosqueId: filters.mosqueId });
        if (filters.districtId)
            qb.andWhere('mp.district_id = :districtId', { districtId: filters.districtId });
        if (filters.category)
            qb.andWhere('mp.category = :category', { category: filters.category });
        if (filters.approvalStatus)
            qb.andWhere('mp.approval_status = :approvalStatus', { approvalStatus: filters.approvalStatus });
        if (filters.memberStatus)
            qb.andWhere('mp.member_status = :memberStatus', { memberStatus: filters.memberStatus });
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findById(id) {
        const profile = await this.profiles.findOne({ where: { id }, relations: ['user'] });
        if (!profile)
            throw new common_1.NotFoundException('Member profile not found');
        return profile;
    }
    async findByUserId(userId) {
        const profile = await this.profiles.findOne({ where: { userId }, relations: ['user'] });
        if (!profile)
            throw new common_1.NotFoundException('Member profile not found');
        return profile;
    }
    async approve(id, adminId, dto) {
        const profile = await this.findById(id);
        if (profile.approvalStatus !== member_profile_entity_1.ApprovalStatus.PENDING) {
            throw new common_1.BadRequestException('Profile is not in pending state');
        }
        if (dto.action === approve_member_dto_1.ApprovalAction.APPROVE) {
            profile.approvalStatus = member_profile_entity_1.ApprovalStatus.APPROVED;
            profile.approvedBy = adminId;
            profile.approvedAt = new Date();
            profile.rejectionReason = null;
        }
        else {
            if (!dto.reason)
                throw new common_1.BadRequestException('Rejection reason is required');
            profile.approvalStatus = member_profile_entity_1.ApprovalStatus.REJECTED;
            profile.rejectionReason = dto.reason;
        }
        return this.profiles.save(profile);
    }
    async updateStatus(id, adminId, dto) {
        const profile = await this.findById(id);
        profile.memberStatus = dto.status;
        profile.statusReason = dto.reason ?? null;
        profile.statusChangedBy = adminId;
        profile.statusChangedAt = new Date();
        return this.profiles.save(profile);
    }
    async updateCategory(id, category) {
        const profile = await this.findById(id);
        profile.category = category;
        return this.profiles.save(profile);
    }
    async updatePhotoKey(userId, photoKey) {
        const profile = await this.findByUserId(userId);
        profile.photoKey = photoKey;
        return this.profiles.save(profile);
    }
    async generateDigitalIdCard(id) {
        const profile = await this.findById(id);
        const user = profile.user;
        const qrData = JSON.stringify({
            membershipNumber: profile.membershipNumber,
            name: `${user.firstName} ${user.lastName}`,
            category: profile.category,
            issued: new Date().toISOString().split('T')[0],
            verify: `https://rmc.org.rw/verify/${profile.membershipNumber}`,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 150, margin: 1 });
        const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const page = pdfDoc.addPage([340, 210]);
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: (0, pdf_lib_1.rgb)(0.1, 0.48, 0.29) });
        page.drawText('RWANDA MUSLIM COMMUNITY', {
            x: 12, y: height - 25, size: 11, font, color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        page.drawText('Digital Membership Card', {
            x: 12, y: height - 42, size: 8, font: fontRegular, color: (0, pdf_lib_1.rgb)(0.85, 0.85, 0.85),
        });
        page.drawText(`${user.firstName} ${user.lastName}`, {
            x: 12, y: height - 80, size: 14, font, color: (0, pdf_lib_1.rgb)(0.1, 0.1, 0.1),
        });
        const details = [
            ['Membership No:', profile.membershipNumber],
            ['Category:', profile.category.charAt(0).toUpperCase() + profile.category.slice(1)],
            ['Joined:', profile.joinedDate?.toString().split('T')[0] ?? ''],
            ['Status:', profile.approvalStatus === 'approved' ? 'ACTIVE' : profile.approvalStatus.toUpperCase()],
        ];
        details.forEach(([label, value], i) => {
            page.drawText(label, { x: 12, y: height - 105 - i * 20, size: 8, font, color: (0, pdf_lib_1.rgb)(0.4, 0.4, 0.4) });
            page.drawText(value, { x: 110, y: height - 105 - i * 20, size: 8, font: fontRegular, color: (0, pdf_lib_1.rgb)(0.1, 0.1, 0.1) });
        });
        const qrImage = await pdfDoc.embedPng(qrImageBytes);
        page.drawImage(qrImage, { x: width - 130, y: 15, width: 110, height: 110 });
        page.drawRectangle({ x: 0, y: 0, width, height: 14, color: (0, pdf_lib_1.rgb)(0.1, 0.48, 0.29) });
        page.drawText('rmc.org.rw  |  Valid only with QR verification', {
            x: 10, y: 3, size: 6, font: fontRegular, color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }
    getStatistics() {
        return Promise.all([
            this.profiles.count(),
            this.profiles.count({ where: { approvalStatus: member_profile_entity_1.ApprovalStatus.APPROVED } }),
            this.profiles.count({ where: { approvalStatus: member_profile_entity_1.ApprovalStatus.PENDING } }),
            this.profiles.count({ where: { approvalStatus: member_profile_entity_1.ApprovalStatus.REJECTED } }),
        ]).then(([total, approved, pending, rejected]) => ({ total, approved, pending, rejected }));
    }
    async getWeeklyStats() {
        const rows = await this.profiles
            .createQueryBuilder('mp')
            .select("TO_CHAR(mp.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'day')
            .addSelect('COUNT(*)', 'count')
            .where("mp.created_at >= NOW() - INTERVAL '7 days'")
            .groupBy("TO_CHAR(mp.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')")
            .orderBy("day", 'ASC')
            .getRawMany();
        return rows.map((r) => ({ day: r.day, count: parseInt(r.count, 10) }));
    }
};
exports.MembersService = MembersService;
exports.MembersService = MembersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(member_profile_entity_1.MemberProfile)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MembersService);
//# sourceMappingURL=members.service.js.map