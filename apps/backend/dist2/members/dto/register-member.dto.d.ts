import { MemberCategory } from '../entities/member-profile.entity';
export declare class RegisterMemberDto {
    nationalId?: string;
    occupation?: string;
    educationLevel?: string;
    category?: MemberCategory;
    mosqueId?: string;
    provinceId?: string;
    districtId?: string;
    sectorId?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    consentGiven: boolean;
}
