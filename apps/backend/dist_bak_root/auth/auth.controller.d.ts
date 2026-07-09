import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MfaVerifySetupDto, MfaDisableDto } from './dto/mfa-verify-setup.dto';
import { TwoFactorVerifySetupDto, TwoFactorDisableDto, TwoFactorVerifyLoginDto, TwoFactorResendDto } from './dto/two-factor.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from '../users/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        userId: string;
        message: string;
    }>;
    login(dto: LoginDto, req: ExpressRequest): Promise<unknown>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(user: User, body: {
        refreshToken?: string;
    }): Promise<{
        message: string;
    }>;
    sendOtp(dto: SendOtpDto): Promise<{
        message: string;
        expiresAt: Date;
    }>;
    verifyPhone(dto: VerifyPhoneDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    getProfile(user: User): Promise<Partial<User> & {
        membershipNumber?: string;
        joinedDate?: Date;
    }>;
    updateProfile(user: User, dto: UpdateProfileDto): Promise<Partial<User>>;
    changePassword(user: User, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    mfaSetup(user: User): Promise<{
        qrCodeDataUrl: string;
        manualEntryCode: string;
    }>;
    mfaVerifySetup(user: User, dto: MfaVerifySetupDto): Promise<{
        message: string;
    }>;
    mfaDisable(user: User, dto: MfaDisableDto): Promise<{
        message: string;
    }>;
    twoFactorStatus(user: User): Promise<{
        enabled: boolean;
        maskedPhone: string | null;
    }>;
    twoFactorSetup(user: User): Promise<{
        message: string;
        maskedPhone: string;
        expiresAt: Date;
    }>;
    twoFactorVerifySetup(user: User, dto: TwoFactorVerifySetupDto): Promise<{
        message: string;
    }>;
    twoFactorDisable(user: User, dto: TwoFactorDisableDto): Promise<{
        message: string;
    }>;
    twoFactorVerifyLogin(dto: TwoFactorVerifyLoginDto, req: ExpressRequest): Promise<{
        accessToken: string;
        refreshToken: string;
        user: Partial<User>;
    }>;
    twoFactorResend(dto: TwoFactorResendDto): Promise<{
        message: string;
        maskedPhone: string;
        expiresAt: Date;
    }>;
}
