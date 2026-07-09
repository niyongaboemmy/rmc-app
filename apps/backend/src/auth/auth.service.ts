import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as nodemailer from 'nodemailer';
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
import { ErrorCode } from '../common/types/error-codes.enum';
import { JwtPayload } from '../common/types/jwt-payload.interface';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetRepo: Repository<PasswordResetToken>,
    @InjectRepository(PhoneOtpVerification)
    private readonly otpRepo: Repository<PhoneOtpVerification>,
    @InjectRepository(MemberProfile)
    private readonly memberProfileRepo: Repository<MemberProfile>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRedis() private readonly redis: Redis,
    private readonly notifSettings: NotificationSettingsService,
    private readonly smsService: SmsService,
  ) {}

  // ── Register ─────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ userId: string; message: string }> {
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException({
        code: ErrorCode.AUTH_EMAIL_EXISTS,
        message: 'Email already registered',
      });
    }

    const existingPhone = await this.usersService.findByPhone(dto.phone);
    if (existingPhone) {
      throw new ConflictException({
        code: ErrorCode.AUTH_PHONE_EXISTS,
        message: 'Phone already registered',
      });
    }

    const rounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.usersService.save({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      gender: dto.gender || null,
      role: 'user',
      status: 'pending',
    });

    const membershipNumber = await this.generateMembershipNumber();
    await this.memberProfileRepo.save({
      userId: user.id,
      membershipNumber,
      joinedDate: new Date(),
    });

    await this.writeAuditLog('user', user.id, 'create', user.id, user.role);
    await this.sendWelcomeEmail(user);

    return {
      userId: user.id,
      message: 'Registration successful. Please verify your phone number.',
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken?: string;
    refreshToken?: string;
    requiresMfa?: boolean;
    requires2fa?: boolean;
    tempToken?: string;
    maskedPhone?: string;
    user?: Partial<User>;
  }> {
    const user = await this.usersService.findByEmailOrPhone(dto.identifier);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException({
        code: ErrorCode.AUTH_ACCOUNT_SUSPENDED,
        message: 'Account is suspended',
      });
    }

    if (user.status === 'inactive') {
      throw new ForbiddenException({
        code: ErrorCode.AUTH_ACCOUNT_INACTIVE,
        message: 'Account is inactive',
      });
    }

    // Step 1: TOTP (authenticator app) check
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return { requiresMfa: true };
      }
      this.verifyTotp(user, dto.mfaCode);
    }

    // Step 2: SMS 2FA check
    if (user.twoFactorEnabled) {
      const tempToken = await this.issue2faTempToken(user.id);
      await this.send2faOtp(user.id, user.phone, '2fa_login_otp');
      return {
        requires2fa: true,
        tempToken,
        maskedPhone: this.maskPhone(user.phone),
      };
    }

    return this.completLogin(user, ipAddress, userAgent);
  }

  private async completLogin(user: User, ipAddress?: string, userAgent?: string) {
    const { accessToken, refreshToken } = await this.issueTokens(user, ipAddress, userAgent);
    await this.usersService.update(user.id, { lastLoginAt: new Date() });
    await this.writeAuditLog('user', user.id, 'login', user.id, user.role);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  // ── Refresh tokens ────────────────────────────────────────────────────────────

  async refreshTokens(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.refreshTokenRepo.findOne({
      where: { tokenHash, expiresAt: MoreThan(new Date()) },
    });

    if (!record) {
      // Check if it's a revoked token (potential theft)
      const revoked = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
      if (revoked) {
        this.logger.warn(`Refresh token reuse detected for user ${revoked.userId}`);
        await this.revokeAllUserTokens(revoked.userId);
        await this.writeAuditLog(
          'user',
          revoked.userId,
          'token_theft_suspected',
          revoked.userId,
          'system',
        );
      }
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_REFRESH_TOKEN,
        message: 'Invalid or expired refresh token',
      });
    }

    // Revoke old token
    await this.refreshTokenRepo.update(record.id, { revokedAt: new Date() });

    const user = await this.usersService.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_REFRESH_TOKEN,
        message: 'User not found',
      });
    }

    return this.issueTokens(user, record.ipAddress || undefined, record.userAgent || undefined);
  }

  // ── Logout ────────────────────────────────────────────────────────────────────

  async logout(userId: string, rawRefreshToken?: string): Promise<{ message: string }> {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.refreshTokenRepo.update(
        { tokenHash, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } else {
      await this.revokeAllUserTokens(userId);
    }

    await this.writeAuditLog('user', userId, 'logout', userId, 'user');
    return { message: 'Logged out successfully' };
  }

  // ── OTP ───────────────────────────────────────────────────────────────────────

  async sendOtp(phone: string): Promise<{ message: string; expiresAt: Date }> {
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
    }

    if (user.isPhoneVerified) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_PHONE_ALREADY_VERIFIED,
        message: 'Phone already verified',
      });
    }

    const rateLimitKey = `otp_rate:${phone}`;
    const count = await this.redis.incr(rateLimitKey);
    if (count === 1) {
      await this.redis.expire(rateLimitKey, 600); // 10 minutes
    }
    if (count > 3) {
      throw new BadRequestException({
        code: 'AUTH_OTP_RATE_LIMITED',
        message: 'Too many OTP requests. Try again later.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(
      Date.now() + this.configService.get<number>('app.otpExpiryMinutes', 5) * 60 * 1000,
    );

    await this.otpRepo.save({ userId: user.id, phone, otpHash, expiresAt });

    // Dev mode: log OTP to console
    const expiresStr = expiresAt.toTimeString().split(' ')[0];
    this.logger.log(`[OTP] Phone: ${phone} | Code: ${otp} | Expires: ${expiresStr}`);

    return { message: 'OTP sent', expiresAt };
  }

  async verifyPhone(phone: string, otp: string): Promise<{ message: string }> {
    const record = await this.otpRepo.findOne({
      where: { phone, verifiedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_OTP_NOT_FOUND,
        message: 'OTP not found. Request a new one.',
      });
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_OTP_EXPIRED,
        message: 'OTP has expired',
      });
    }

    if (record.attempts >= 5) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_OTP_MAX_ATTEMPTS,
        message: 'Maximum OTP attempts exceeded',
      });
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== record.otpHash) {
      await this.otpRepo.update(record.id, { attempts: record.attempts + 1 });
      throw new BadRequestException({
        code: ErrorCode.AUTH_OTP_INVALID,
        message: 'Invalid OTP code',
      });
    }

    await this.otpRepo.update(record.id, { verifiedAt: new Date() });
    await this.usersService.update(record.userId, { isPhoneVerified: true });
    await this.writeAuditLog('user', record.userId, 'phone_verified', record.userId, 'user');

    return { message: 'Phone verified successfully' };
  }

  // ── Password Reset ────────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const rawToken = uuidv4();
      const tokenHash = this.hashToken(rawToken);
      const expiresMinutes = this.configService.get<number>('app.passwordResetExpiryMinutes', 15);
      const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

      await this.passwordResetRepo.save({ userId: user.id, tokenHash, expiresAt });

      const frontendUrl = this.configService.get<string>(
        'app.frontendUrl',
        'http://localhost:3001',
      );
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      this.logger.log(
        `[PASSWORD RESET] Email sent to: ${email} | Token hash: ${tokenHash.substring(0, 8)}... | Expires: ${expiresAt.toTimeString().split(' ')[0]}`,
      );
      await this.sendPasswordResetEmail(user, resetUrl);
    }

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);
    const record = await this.passwordResetRepo.findOne({
      where: { tokenHash, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });

    if (!record) {
      const expired = await this.passwordResetRepo.findOne({ where: { tokenHash } });
      if (expired && expired.expiresAt < new Date()) {
        throw new BadRequestException({
          code: ErrorCode.AUTH_RESET_TOKEN_EXPIRED,
          message: 'Reset token has expired',
        });
      }
      throw new BadRequestException({
        code: ErrorCode.AUTH_RESET_TOKEN_INVALID,
        message: 'Invalid reset token',
      });
    }

    const rounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    await this.usersService.update(record.userId, { passwordHash });
    await this.passwordResetRepo.update(record.id, { usedAt: new Date() });
    await this.revokeAllUserTokens(record.userId);

    const user = await this.usersService.findById(record.userId);
    if (user) {
      await this.sendPasswordChangedEmail(user);
    }

    await this.writeAuditLog('user', record.userId, 'password_reset', record.userId, 'user');
    return { message: 'Password reset successful. Please log in with your new password.' };
  }

  // ── MFA ───────────────────────────────────────────────────────────────────────

  async mfaSetup(userId: string): Promise<{ qrCodeDataUrl: string; manualEntryCode: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    if (user.mfaEnabled) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_MFA_ALREADY_ENABLED,
        message: 'MFA is already enabled',
      });
    }

    const appName = this.configService.get<string>('app.mfa.appName', 'RMC Platform');
    const secret = speakeasy.generateSecret({
      name: `${appName} (${user.email})`,
      issuer: 'Rwanda Muslim Community',
      length: 20,
    });

    const encryptedSecret = this.encryptMfaSecret(secret.base32);
    await this.redis.setex(`mfa_setup:${userId}`, 600, encryptedSecret);

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: encodeURIComponent(`${appName}:${user.email}`),
      issuer: 'Rwanda Muslim Community',
      encoding: 'base32',
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { qrCodeDataUrl, manualEntryCode: secret.base32 };
  }

  async mfaVerifySetup(userId: string, totp: string): Promise<{ message: string }> {
    const encryptedSecret = await this.redis.get(`mfa_setup:${userId}`);
    if (!encryptedSecret) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_MFA_SETUP_NOT_INITIATED,
        message: 'MFA setup not initiated. Call /mfa/setup first.',
      });
    }

    const secret = this.decryptMfaSecret(encryptedSecret);
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: totp, window: 1 });

    if (!valid) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_MFA_INVALID_CODE,
        message: 'Invalid TOTP code',
      });
    }

    await this.usersService.update(userId, { mfaSecret: encryptedSecret, mfaEnabled: true });
    await this.redis.del(`mfa_setup:${userId}`);
    await this.writeAuditLog('user', userId, 'mfa_enabled', userId, 'user');

    return { message: 'MFA enabled successfully' };
  }

  async mfaDisable(userId: string, password: string, totp: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid password',
      });
    }

    this.verifyTotp(user, totp);

    await this.usersService.update(userId, { mfaEnabled: false, mfaSecret: null });
    await this.writeAuditLog('user', userId, 'mfa_disabled', userId, 'user');

    return { message: 'MFA disabled successfully' };
  }

  // ── Two-Factor Auth (SMS OTP) ─────────────────────────────────────────────────

  async twoFactorStatus(userId: string): Promise<{ enabled: boolean; maskedPhone: string | null }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return {
      enabled: user.twoFactorEnabled,
      maskedPhone: user.twoFactorEnabled ? this.maskPhone(user.phone) : null,
    };
  }

  async twoFactorSetup(
    userId: string,
  ): Promise<{ message: string; maskedPhone: string; expiresAt: Date }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    if (user.twoFactorEnabled) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_2FA_ALREADY_ENABLED,
        message: '2FA is already enabled',
      });
    }

    const expiresAt = await this.send2faOtp(userId, user.phone, '2fa_setup_otp');
    return {
      message: 'OTP sent to your phone',
      maskedPhone: this.maskPhone(user.phone),
      expiresAt,
    };
  }

  async twoFactorVerifySetup(userId: string, otp: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    if (user.twoFactorEnabled) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_2FA_ALREADY_ENABLED,
        message: '2FA is already enabled',
      });
    }

    await this.verify2faOtp(userId, otp, '2fa_setup_otp');
    await this.usersService.update(userId, { twoFactorEnabled: true });
    await this.writeAuditLog('user', userId, 'two_factor_enabled', userId, 'user');

    return { message: '2-Step Verification enabled successfully' };
  }

  async twoFactorDisable(userId: string, password: string): Promise<{ message: string }> {
    const user = await this.usersService.findByIdRaw(userId);
    if (!user) throw new UnauthorizedException();

    if (!user.twoFactorEnabled) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_2FA_NOT_ENABLED,
        message: '2FA is not enabled',
      });
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid password',
      });
    }

    await this.usersService.update(userId, { twoFactorEnabled: false });
    await this.writeAuditLog('user', userId, 'two_factor_disabled', userId, 'user');

    return { message: '2-Step Verification disabled successfully' };
  }

  /** Called during login: validates tempToken + OTP, then issues full session tokens. */
  async twoFactorVerifyLogin(
    tempToken: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: Partial<User> }> {
    const userId = this.verify2faTempToken(tempToken);
    await this.verify2faOtp(userId, otp, '2fa_login_otp');

    const user = await this.usersService.findById(userId);
    if (!user)
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'User not found',
      });

    const result = await this.completLogin(user, ipAddress, userAgent);
    return result as { accessToken: string; refreshToken: string; user: Partial<User> };
  }

  /** Resend OTP during a pending 2FA login (validates tempToken first). */
  async twoFactorResend(
    tempToken: string,
  ): Promise<{ message: string; maskedPhone: string; expiresAt: Date }> {
    const userId = this.verify2faTempToken(tempToken);
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const expiresAt = await this.send2faOtp(userId, user.phone, '2fa_login_otp');
    return { message: 'OTP resent', maskedPhone: this.maskPhone(user.phone), expiresAt };
  }

  // ── Profile ───────────────────────────────────────────────────────────────────

  async getProfile(
    userId: string,
  ): Promise<Partial<User> & { membershipNumber?: string; joinedDate?: Date }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, mfaSecret, ...safe } = user as User & {
      passwordHash: string;
      mfaSecret: string;
    };

    const member = await this.memberProfileRepo.findOne({ where: { userId } });
    return {
      ...safe,
      membershipNumber: member?.membershipNumber ?? undefined,
      joinedDate: member?.joinedDate ?? undefined,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Partial<User>> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    const updated = await this.usersService.updateProfile(userId, dto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, mfaSecret, ...safe } = updated as User & {
      passwordHash: string;
      mfaSecret: string;
    };
    return safe;
  }

  // ── Change Password ───────────────────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByIdRaw(userId);
    if (!user) throw new UnauthorizedException();

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Current password is incorrect',
      });
    }

    const rounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.newPassword, rounds);

    await this.usersService.update(userId, { passwordHash });
    await this.revokeAllUserTokens(userId);
    await this.writeAuditLog('user', userId, 'password_changed', userId, 'user');
    await this.sendPasswordChangedEmail(user);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  // ── JWT Strategy validation ───────────────────────────────────────────────────

  async validateJwtPayload(payload: JwtPayload): Promise<User & { permissions: string[] }> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status === 'inactive' || user.status === 'suspended') {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'User not found or inactive',
      });
    }
    // Attach permissions from payload (already resolved at token issuance)
    return Object.assign(user, { permissions: payload.permissions ?? [] });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async loadUserPermissions(user: User): Promise<string[]> {
    if (user.role === 'superadmin') return ['*'];
    if (!user.roleId) return [];
    const role = await this.roleRepo.findOne({ where: { id: user.roleId } });
    return role?.permissions ?? [];
  }

  private async issueTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const permissions = await this.loadUserPermissions(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      permissions,
    };
    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = uuidv4();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepo.save({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private encryptMfaSecret(plaintext: string): string {
    const key = crypto.scryptSync(
      this.configService.get<string>('jwt.accessSecret', 'dev-secret'),
      'rmc-salt',
      32,
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptMfaSecret(ciphertext: string): string {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const key = crypto.scryptSync(
      this.configService.get<string>('jwt.accessSecret', 'dev-secret'),
      'rmc-salt',
      32,
    );
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  private verifyTotp(user: User, code: string): void {
    if (!user.mfaSecret) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_MFA_INVALID_CODE,
        message: 'MFA not configured',
      });
    }
    const secret = this.decryptMfaSecret(user.mfaSecret);
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
    if (!valid) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_MFA_INVALID_CODE,
        message: 'Invalid MFA code',
      });
    }
  }

  private async generateMembershipNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `membership_counter:${year}`;
    const seq = await this.redis.incr(key);
    return `RMC-${year}-${seq.toString().padStart(6, '0')}`;
  }

  private async writeAuditLog(
    entityType: string,
    entityId: string,
    action: string,
    actorId: string,
    actorRole: string,
  ): Promise<void> {
    await this.auditLogRepo.save({
      entityType,
      entityId,
      action,
      actorId,
      actorRole,
      performedAt: new Date(),
    });
  }

  private async sendWelcomeEmail(user: User): Promise<void> {
    if (!this.notifSettings.isEmailEnabled('auth.welcome_email')) return;
    try {
      const transporter = this.createMailTransporter();
      await transporter.sendMail({
        from: this.configService.get<string>('app.smtp.from'),
        to: user.email,
        subject: 'Welcome to RMC Platform',
        html: `
          <h1>Welcome to the RMC Digital Platform, ${user.firstName}!</h1>
          <p>Your account has been created successfully.</p>
          <p>Next step: Please verify your phone number to complete your registration.</p>
          <p>Thank you for joining the Rwanda Muslim Community.</p>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${user.email}: ${err}`);
    }
  }

  private async sendPasswordResetEmail(user: User, resetUrl: string): Promise<void> {
    if (!this.notifSettings.isEmailEnabled('auth.password_reset')) return;
    try {
      const transporter = this.createMailTransporter();
      await transporter.sendMail({
        from: this.configService.get<string>('app.smtp.from'),
        to: user.email,
        subject: 'RMC Platform — Reset Your Password',
        html: `
          <h1>Password Reset Request</h1>
          <p>Hello ${user.firstName},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p><strong>This link expires in 15 minutes.</strong></p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send password reset email: ${err}`);
    }
  }

  private async sendPasswordChangedEmail(user: User): Promise<void> {
    if (!this.notifSettings.isEmailEnabled('auth.password_changed')) return;
    try {
      const transporter = this.createMailTransporter();
      await transporter.sendMail({
        from: this.configService.get<string>('app.smtp.from'),
        to: user.email,
        subject: 'RMC Platform — Password Changed',
        html: `
          <h1>Password Changed</h1>
          <p>Hello ${user.firstName},</p>
          <p>Your password has been changed successfully.</p>
          <p>If you did not make this change, please contact support immediately.</p>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send password changed email: ${err}`);
    }
  }

  /** Issue a short-lived temp token used to complete a 2FA login. */
  private async issue2faTempToken(userId: string): Promise<string> {
    return this.jwtService.sign({ sub: userId, stage: 'pending_2fa' }, { expiresIn: '5m' });
  }

  /** Validate a 2FA temp token; throws if invalid/expired. Returns userId. */
  private verify2faTempToken(tempToken: string): string {
    try {
      const payload = this.jwtService.verify<{ sub: string; stage: string }>(tempToken);
      if (payload.stage !== 'pending_2fa') throw new Error('wrong stage');
      return payload.sub;
    } catch {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_2FA_TEMP_TOKEN_INVALID,
        message: 'Invalid or expired 2FA session. Please log in again.',
      });
    }
  }

  /**
   * Generate an OTP, store its hash in Redis, and send it via SMS.
   * `purpose` keys: '2fa_login_otp' | '2fa_setup_otp'
   */
  private async send2faOtp(userId: string, phone: string, purpose: string): Promise<Date> {
    const rateKey = `${purpose}_rate:${userId}`;
    const count = await this.redis.incr(rateKey);
    if (count === 1) await this.redis.expire(rateKey, 600);
    if (count > 3) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_2FA_OTP_RATE_LIMITED,
        message: 'Too many OTP requests. Try again in 10 minutes.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const ttlSeconds = this.configService.get<number>('app.otpExpiryMinutes', 5) * 60;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.redis.setex(
      `${purpose}:${userId}`,
      ttlSeconds,
      JSON.stringify({ hash: otpHash, attempts: 0 }),
    );

    this.logger.log(
      `[2FA OTP] userId=${userId} | phone=${phone} | code=${otp} | expires=${expiresAt.toTimeString().split(' ')[0]}`,
    );

    if (this.notifSettings.isSmsEnabled('auth.otp_sms')) {
      void this.smsService.sendSms(
        phone,
        `RMC Platform: Your verification code is ${otp}. Valid for 5 minutes. Do not share it.`,
      );
    }

    return expiresAt;
  }

  /** Verify a 2FA OTP from Redis. Throws on invalid/expired/max-attempts. */
  private async verify2faOtp(userId: string, otp: string, purpose: string): Promise<void> {
    const raw = await this.redis.get(`${purpose}:${userId}`);
    if (!raw) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_2FA_SETUP_NOT_INITIATED,
        message: 'OTP not found or expired. Request a new one.',
      });
    }

    const stored = JSON.parse(raw) as { hash: string; attempts: number };

    if (stored.attempts >= 5) {
      await this.redis.del(`${purpose}:${userId}`);
      throw new BadRequestException({
        code: ErrorCode.AUTH_OTP_MAX_ATTEMPTS,
        message: 'Maximum attempts exceeded. Request a new code.',
      });
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== stored.hash) {
      stored.attempts += 1;
      const ttl = await this.redis.ttl(`${purpose}:${userId}`);
      if (ttl > 0) {
        await this.redis.setex(`${purpose}:${userId}`, ttl, JSON.stringify(stored));
      }
      throw new BadRequestException({
        code: ErrorCode.AUTH_2FA_INVALID_CODE,
        message: 'Invalid verification code',
      });
    }

    await this.redis.del(`${purpose}:${userId}`);
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return phone;
    return phone.slice(0, 4) + '****' + phone.slice(-2);
  }

  private createMailTransporter(): nodemailer.Transporter {
    const user = this.configService.get<string>('app.smtp.user');
    return nodemailer.createTransport({
      host: this.configService.get<string>('app.smtp.host', 'localhost'),
      port: this.configService.get<number>('app.smtp.port', 1025),
      secure: this.configService.get<boolean>('app.smtp.secure', false),
      auth: user ? { user, pass: this.configService.get<string>('app.smtp.pass') } : undefined,
    });
  }
}
