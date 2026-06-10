import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PhoneOtpVerification } from './entities/phone-otp-verification.entity';
import { MemberProfile } from '../members/entities/member-profile.entity';
import { AuditLog } from '../finance/entities/audit-log.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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
    private readonly redis;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, refreshTokenRepo: Repository<RefreshToken>, passwordResetRepo: Repository<PasswordResetToken>, otpRepo: Repository<PhoneOtpVerification>, memberProfileRepo: Repository<MemberProfile>, auditLogRepo: Repository<AuditLog>, redis: Redis);
    register(dto: RegisterDto): Promise<{
        userId: string;
        message: string;
    }>;
    login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
        accessToken?: string;
        refreshToken?: string;
        requiresMfa?: boolean;
        user?: Partial<User>;
    }>;
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
    validateJwtPayload(payload: JwtPayload): Promise<User>;
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
    private createMailTransporter;
}
