import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { NotificationSettingsService } from '../integrations/notifications/notification-settings.service';
import { SmsService } from '../integrations/sms/sms.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PhoneOtpVerification } from './entities/phone-otp-verification.entity';
import { MemberProfile } from '../members/entities/member-profile.entity';
import { AuditLog } from '../finance/entities/audit-log.entity';
import { Role } from '../roles/entities/role.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtPayload } from '../common/types/jwt-payload.interface';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly configService;
    private readonly refreshTokenRepo;
    private readonly passwordResetRepo;
    private readonly otpRepo;
    private readonly memberProfileRepo;
    private readonly auditLogRepo;
    private readonly roleRepo;
    private readonly redis;
    private readonly notifSettings;
    private readonly smsService;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, refreshTokenRepo: Repository<RefreshToken>, passwordResetRepo: Repository<PasswordResetToken>, otpRepo: Repository<PhoneOtpVerification>, memberProfileRepo: Repository<MemberProfile>, auditLogRepo: Repository<AuditLog>, roleRepo: Repository<Role>, redis: Redis, notifSettings: NotificationSettingsService, smsService: SmsService);
    register(dto: RegisterDto): Promise<{
        userId: string;
        message: string;
    }>;
    login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
        accessToken?: string;
        refreshToken?: string;
        requiresMfa?: boolean;
        requires2fa?: boolean;
        tempToken?: string;
        maskedPhone?: string;
        user?: Partial<User>;
    }>;
    private completLogin;
    refreshTokens(rawToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, rawRefreshToken?: string): Promise<{
        message: string;
    }>;
    sendOtp(phone: string): Promise<{
        message: string;
        expiresAt: Date;
    }>;
    verifyPhone(phone: string, otp: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    mfaSetup(userId: string): Promise<{
        qrCodeDataUrl: string;
        manualEntryCode: string;
    }>;
    mfaVerifySetup(userId: string, totp: string): Promise<{
        message: string;
    }>;
    mfaDisable(userId: string, password: string, totp: string): Promise<{
        message: string;
    }>;
    twoFactorStatus(userId: string): Promise<{
        enabled: boolean;
        maskedPhone: string | null;
    }>;
    twoFactorSetup(userId: string): Promise<{
        message: string;
        maskedPhone: string;
        expiresAt: Date;
    }>;
    twoFactorVerifySetup(userId: string, otp: string): Promise<{
        message: string;
    }>;
    twoFactorDisable(userId: string, password: string): Promise<{
        message: string;
    }>;
    twoFactorVerifyLogin(tempToken: string, otp: string, ipAddress?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: Partial<User>;
    }>;
    twoFactorResend(tempToken: string): Promise<{
        message: string;
        maskedPhone: string;
        expiresAt: Date;
    }>;
    getProfile(userId: string): Promise<Partial<User> & {
        membershipNumber?: string;
        joinedDate?: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<Partial<User>>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    validateJwtPayload(payload: JwtPayload): Promise<User & {
        permissions: string[];
    }>;
    private loadUserPermissions;
    private issueTokens;
    private revokeAllUserTokens;
    private hashToken;
    private encryptMfaSecret;
    private decryptMfaSecret;
    private verifyTotp;
    private generateMembershipNumber;
    private writeAuditLog;
    private sendWelcomeEmail;
    private sendPasswordResetEmail;
    private sendPasswordChangedEmail;
    private issue2faTempToken;
    private verify2faTempToken;
    private send2faOtp;
    private verify2faOtp;
    private maskPhone;
    private createMailTransporter;
}
