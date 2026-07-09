import { Response } from 'express';
import { MembersService } from './members.service';
import { RegisterMemberDto } from './dto/register-member.dto';
import { ApproveMemberDto } from './dto/approve-member.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { JwtPayload } from '../common/types/jwt-payload.interface';
export declare class MembersController {
    private readonly members;
    constructor(members: MembersService);
    register(user: JwtPayload, dto: RegisterMemberDto): Promise<import("./entities/member-profile.entity").MemberProfile>;
    findAll(search?: string, mosqueId?: string, districtId?: string, category?: string, approvalStatus?: string, memberStatus?: string, page?: string, limit?: string): Promise<{
        data: import("./entities/member-profile.entity").MemberProfile[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    getStats(): Promise<{
        total: number;
        approved: number;
        pending: number;
        rejected: number;
    }>;
    getWeeklyStats(): Promise<{
        day: string;
        count: number;
    }[]>;
    getMyProfile(user: JwtPayload): Promise<import("./entities/member-profile.entity").MemberProfile>;
    findOne(id: string): Promise<import("./entities/member-profile.entity").MemberProfile>;
    approve(id: string, user: JwtPayload, dto: ApproveMemberDto): Promise<import("./entities/member-profile.entity").MemberProfile>;
    updateStatus(id: string, user: JwtPayload, dto: UpdateMemberStatusDto): Promise<import("./entities/member-profile.entity").MemberProfile>;
    downloadIdCard(id: string, res: Response): Promise<void>;
}
