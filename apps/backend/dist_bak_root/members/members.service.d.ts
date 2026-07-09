import { Repository } from 'typeorm';
import { MemberProfile } from './entities/member-profile.entity';
import { User } from '../users/entities/user.entity';
import { RegisterMemberDto } from './dto/register-member.dto';
import { ApproveMemberDto } from './dto/approve-member.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
export declare class MembersService {
    private profiles;
    private users;
    constructor(profiles: Repository<MemberProfile>, users: Repository<User>);
    private generateMembershipNumber;
    register(userId: string, dto: RegisterMemberDto): Promise<MemberProfile>;
    findAll(filters: {
        search?: string;
        mosqueId?: string;
        districtId?: string;
        category?: string;
        approvalStatus?: string;
        memberStatus?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: MemberProfile[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findById(id: string): Promise<MemberProfile>;
    findByUserId(userId: string): Promise<MemberProfile>;
    approve(id: string, adminId: string, dto: ApproveMemberDto): Promise<MemberProfile>;
    updateStatus(id: string, adminId: string, dto: UpdateMemberStatusDto): Promise<MemberProfile>;
    updateCategory(id: string, category: string): Promise<MemberProfile>;
    updatePhotoKey(userId: string, photoKey: string): Promise<MemberProfile>;
    generateDigitalIdCard(id: string): Promise<Buffer>;
    getStatistics(): Promise<{
        total: number;
        approved: number;
        pending: number;
        rejected: number;
    }>;
    getWeeklyStats(): Promise<{
        day: string;
        count: number;
    }[]>;
}
