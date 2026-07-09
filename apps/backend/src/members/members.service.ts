import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { MemberProfile, ApprovalStatus, MemberStatus } from './entities/member-profile.entity';
import { User } from '../users/entities/user.entity';
import { RegisterMemberDto } from './dto/register-member.dto';
import { ApproveMemberDto, ApprovalAction } from './dto/approve-member.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(MemberProfile) private profiles: Repository<MemberProfile>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  private generateMembershipNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `RMC-${year}-${random}`;
  }

  async register(userId: string, dto: RegisterMemberDto): Promise<MemberProfile> {
    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Member profile already exists for this user');

    if (dto.nationalId) {
      const nationalIdConflict = await this.profiles.findOne({
        where: { nationalId: dto.nationalId },
      });
      if (nationalIdConflict) throw new ConflictException('National ID already registered');
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
      approvalStatus: ApprovalStatus.PENDING,
      memberStatus: MemberStatus.ACTIVE,
      ...dto,
    });

    return this.profiles.save(profile);
  }

  async findAll(filters: {
    search?: string;
    mosqueId?: string;
    districtId?: string;
    category?: string;
    approvalStatus?: string;
    memberStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const qb = this.profiles
      .createQueryBuilder('mp')
      .leftJoinAndSelect('mp.user', 'u')
      .skip(skip)
      .take(limit)
      .orderBy('mp.createdAt', 'DESC');

    if (filters.search) {
      qb.andWhere(
        '(u.first_name ILIKE :s OR u.last_name ILIKE :s OR u.email ILIKE :s OR mp.membership_number ILIKE :s OR mp.national_id ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    }
    if (filters.mosqueId) qb.andWhere('mp.mosque_id = :mosqueId', { mosqueId: filters.mosqueId });
    if (filters.districtId)
      qb.andWhere('mp.district_id = :districtId', { districtId: filters.districtId });
    if (filters.category) qb.andWhere('mp.category = :category', { category: filters.category });
    if (filters.approvalStatus)
      qb.andWhere('mp.approval_status = :approvalStatus', {
        approvalStatus: filters.approvalStatus,
      });
    if (filters.memberStatus)
      qb.andWhere('mp.member_status = :memberStatus', { memberStatus: filters.memberStatus });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<MemberProfile> {
    const profile = await this.profiles.findOne({ where: { id }, relations: ['user'] });
    if (!profile) throw new NotFoundException('Member profile not found');
    return profile;
  }

  async findByUserId(userId: string): Promise<MemberProfile> {
    const profile = await this.profiles.findOne({ where: { userId }, relations: ['user'] });
    if (!profile) throw new NotFoundException('Member profile not found');
    return profile;
  }

  async approve(id: string, adminId: string, dto: ApproveMemberDto): Promise<MemberProfile> {
    const profile = await this.findById(id);
    if (profile.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Profile is not in pending state');
    }

    if (dto.action === ApprovalAction.APPROVE) {
      profile.approvalStatus = ApprovalStatus.APPROVED;
      profile.approvedBy = adminId;
      profile.approvedAt = new Date();
      profile.rejectionReason = null;
    } else {
      if (!dto.reason) throw new BadRequestException('Rejection reason is required');
      profile.approvalStatus = ApprovalStatus.REJECTED;
      profile.rejectionReason = dto.reason;
    }

    return this.profiles.save(profile);
  }

  async updateStatus(
    id: string,
    adminId: string,
    dto: UpdateMemberStatusDto,
  ): Promise<MemberProfile> {
    const profile = await this.findById(id);
    profile.memberStatus = dto.status;
    profile.statusReason = dto.reason ?? null;
    profile.statusChangedBy = adminId;
    profile.statusChangedAt = new Date();
    return this.profiles.save(profile);
  }

  async updateCategory(id: string, category: string): Promise<MemberProfile> {
    const profile = await this.findById(id);
    profile.category = category;
    return this.profiles.save(profile);
  }

  async updatePhotoKey(userId: string, photoKey: string): Promise<MemberProfile> {
    const profile = await this.findByUserId(userId);
    profile.photoKey = photoKey;
    return this.profiles.save(profile);
  }

  async generateDigitalIdCard(id: string): Promise<Buffer> {
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

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([340, 210]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Background gradient (green header)
    page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0.1, 0.48, 0.29) });

    // Title
    page.drawText('RWANDA MUSLIM COMMUNITY', {
      x: 12,
      y: height - 25,
      size: 11,
      font,
      color: rgb(1, 1, 1),
    });
    page.drawText('Digital Membership Card', {
      x: 12,
      y: height - 42,
      size: 8,
      font: fontRegular,
      color: rgb(0.85, 0.85, 0.85),
    });

    // Member name
    page.drawText(`${user.firstName} ${user.lastName}`, {
      x: 12,
      y: height - 80,
      size: 14,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Details
    const details = [
      ['Membership No:', profile.membershipNumber],
      ['Category:', profile.category.charAt(0).toUpperCase() + profile.category.slice(1)],
      ['Joined:', profile.joinedDate?.toString().split('T')[0] ?? ''],
      [
        'Status:',
        profile.approvalStatus === 'approved' ? 'ACTIVE' : profile.approvalStatus.toUpperCase(),
      ],
    ];
    details.forEach(([label, value], i) => {
      page.drawText(label, {
        x: 12,
        y: height - 105 - i * 20,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText(value, {
        x: 110,
        y: height - 105 - i * 20,
        size: 8,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
    });

    // QR code
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImage, { x: width - 130, y: 15, width: 110, height: 110 });

    // Footer
    page.drawRectangle({ x: 0, y: 0, width, height: 14, color: rgb(0.1, 0.48, 0.29) });
    page.drawText('rmc.org.rw  |  Valid only with QR verification', {
      x: 10,
      y: 3,
      size: 6,
      font: fontRegular,
      color: rgb(1, 1, 1),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  getStatistics() {
    return Promise.all([
      this.profiles.count(),
      this.profiles.count({ where: { approvalStatus: ApprovalStatus.APPROVED } }),
      this.profiles.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
      this.profiles.count({ where: { approvalStatus: ApprovalStatus.REJECTED } }),
    ]).then(([total, approved, pending, rejected]) => ({ total, approved, pending, rejected }));
  }

  async getWeeklyStats(): Promise<{ day: string; count: number }[]> {
    const rows = await this.profiles
      .createQueryBuilder('mp')
      .select("TO_CHAR(mp.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'count')
      .where("mp.created_at >= NOW() - INTERVAL '7 days'")
      .groupBy("TO_CHAR(mp.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')")
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; count: string }>();
    return rows.map((r) => ({ day: r.day, count: parseInt(r.count, 10) }));
  }
}
