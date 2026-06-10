import { User } from '../../users/entities/user.entity';
export declare enum MemberCategory {
    STANDARD = "standard",
    STUDENT = "student",
    SCHOLAR = "scholar",
    PARTNER = "partner",
    VIP = "vip"
}
export declare enum ApprovalStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare enum MemberStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    DECEASED = "deceased"
}
export declare class MemberProfile {
    id: string;
    userId: string;
    user: User;
    membershipNumber: string;
    joinedDate: Date;
    occupation: string | null;
    educationLevel: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    consentGiven: boolean;
    consentDate: Date | null;
    notes: string | null;
    nationalId: string | null;
    category: string;
    mosqueId: string | null;
    provinceId: string | null;
    districtId: string | null;
    sectorId: string | null;
    photoKey: string | null;
    approvalStatus: string;
    approvedBy: string | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    memberStatus: string;
    statusReason: string | null;
    statusChangedBy: string | null;
    statusChangedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
