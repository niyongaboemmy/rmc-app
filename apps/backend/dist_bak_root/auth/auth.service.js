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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const uuid_1 = require("uuid");
const nodemailer = require("nodemailer");
const users_service_1 = require("../users/users.service");
const notification_settings_service_1 = require("../integrations/notifications/notification-settings.service");
const sms_service_1 = require("../integrations/sms/sms.service");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const password_reset_token_entity_1 = require("./entities/password-reset-token.entity");
const phone_otp_verification_entity_1 = require("./entities/phone-otp-verification.entity");
const member_profile_entity_1 = require("../members/entities/member-profile.entity");
const audit_log_entity_1 = require("../finance/entities/audit-log.entity");
const role_entity_1 = require("../roles/entities/role.entity");
const error_codes_enum_1 = require("../common/types/error-codes.enum");
const inject_redis_decorator_1 = require("../common/decorators/inject-redis.decorator");
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService, configService, refreshTokenRepo, passwordResetRepo, otpRepo, memberProfileRepo, auditLogRepo, roleRepo, redis, notifSettings, smsService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.refreshTokenRepo = refreshTokenRepo;
        this.passwordResetRepo = passwordResetRepo;
        this.otpRepo = otpRepo;
        this.memberProfileRepo = memberProfileRepo;
        this.auditLogRepo = auditLogRepo;
        this.roleRepo = roleRepo;
        this.redis = redis;
        this.notifSettings = notifSettings;
        this.smsService = smsService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        const existingEmail = await this.usersService.findByEmail(dto.email);
        if (existingEmail) {
            throw new common_1.ConflictException({ code: error_codes_enum_1.ErrorCode.AUTH_EMAIL_EXISTS, message: 'Email already registered' });
        }
        const existingPhone = await this.usersService.findByPhone(dto.phone);
        if (existingPhone) {
            throw new common_1.ConflictException({ code: error_codes_enum_1.ErrorCode.AUTH_PHONE_EXISTS, message: 'Phone already registered' });
        }
        const rounds = this.configService.get('app.bcryptRounds', 12);
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
        return { userId: user.id, message: 'Registration successful. Please verify your phone number.' };
    }
    async login(dto, ipAddress, userAgent) {
        const user = await this.usersService.findByEmailOrPhone(dto.identifier);
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_INVALID_CREDENTIALS, message: 'Invalid credentials' });
        }
        if (user.status === 'suspended') {
            throw new common_1.ForbiddenException({ code: error_codes_enum_1.ErrorCode.AUTH_ACCOUNT_SUSPENDED, message: 'Account is suspended' });
        }
        if (user.status === 'inactive') {
            throw new common_1.ForbiddenException({ code: error_codes_enum_1.ErrorCode.AUTH_ACCOUNT_INACTIVE, message: 'Account is inactive' });
        }
        if (user.mfaEnabled) {
            if (!dto.mfaCode) {
                return { requiresMfa: true };
            }
            this.verifyTotp(user, dto.mfaCode);
        }
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
    async completLogin(user, ipAddress, userAgent) {
        const { accessToken, refreshToken } = await this.issueTokens(user, ipAddress, userAgent);
        await this.usersService.update(user.id, { lastLoginAt: new Date() });
        await this.writeAuditLog('user', user.id, 'login', user.id, user.role);
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        };
    }
    async refreshTokens(rawToken) {
        const tokenHash = this.hashToken(rawToken);
        const record = await this.refreshTokenRepo.findOne({
            where: { tokenHash, expiresAt: (0, typeorm_2.MoreThan)(new Date()) },
        });
        if (!record) {
            const revoked = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
            if (revoked) {
                this.logger.warn(`Refresh token reuse detected for user ${revoked.userId}`);
                await this.revokeAllUserTokens(revoked.userId);
                await this.writeAuditLog('user', revoked.userId, 'token_theft_suspected', revoked.userId, 'system');
            }
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_INVALID_REFRESH_TOKEN, message: 'Invalid or expired refresh token' });
        }
        await this.refreshTokenRepo.update(record.id, { revokedAt: new Date() });
        const user = await this.usersService.findById(record.userId);
        if (!user) {
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_INVALID_REFRESH_TOKEN, message: 'User not found' });
        }
        return this.issueTokens(user, record.ipAddress || undefined, record.userAgent || undefined);
    }
    async logout(userId, rawRefreshToken) {
        if (rawRefreshToken) {
            const tokenHash = this.hashToken(rawRefreshToken);
            await this.refreshTokenRepo.update({ tokenHash, revokedAt: (0, typeorm_2.IsNull)() }, { revokedAt: new Date() });
        }
        else {
            await this.revokeAllUserTokens(userId);
        }
        await this.writeAuditLog('user', userId, 'logout', userId, 'user');
        return { message: 'Logged out successfully' };
    }
    async sendOtp(phone) {
        const user = await this.usersService.findByPhone(phone);
        if (!user) {
            throw new common_1.NotFoundException({ code: error_codes_enum_1.ErrorCode.NOT_FOUND, message: 'User not found' });
        }
        if (user.isPhoneVerified) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_PHONE_ALREADY_VERIFIED, message: 'Phone already verified' });
        }
        const rateLimitKey = `otp_rate:${phone}`;
        const count = await this.redis.incr(rateLimitKey);
        if (count === 1) {
            await this.redis.expire(rateLimitKey, 600);
        }
        if (count > 3) {
            throw new common_1.BadRequestException({ code: 'AUTH_OTP_RATE_LIMITED', message: 'Too many OTP requests. Try again later.' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const expiresAt = new Date(Date.now() + (this.configService.get('app.otpExpiryMinutes', 5)) * 60 * 1000);
        await this.otpRepo.save({ userId: user.id, phone, otpHash, expiresAt });
        const expiresStr = expiresAt.toTimeString().split(' ')[0];
        this.logger.log(`[OTP] Phone: ${phone} | Code: ${otp} | Expires: ${expiresStr}`);
        return { message: 'OTP sent', expiresAt };
    }
    async verifyPhone(phone, otp) {
        const record = await this.otpRepo.findOne({
            where: { phone, verifiedAt: (0, typeorm_2.IsNull)() },
            order: { createdAt: 'DESC' },
        });
        if (!record) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_OTP_NOT_FOUND, message: 'OTP not found. Request a new one.' });
        }
        if (record.expiresAt < new Date()) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_OTP_EXPIRED, message: 'OTP has expired' });
        }
        if (record.attempts >= 5) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_OTP_MAX_ATTEMPTS, message: 'Maximum OTP attempts exceeded' });
        }
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        if (otpHash !== record.otpHash) {
            await this.otpRepo.update(record.id, { attempts: record.attempts + 1 });
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_OTP_INVALID, message: 'Invalid OTP code' });
        }
        await this.otpRepo.update(record.id, { verifiedAt: new Date() });
        await this.usersService.update(record.userId, { isPhoneVerified: true });
        await this.writeAuditLog('user', record.userId, 'phone_verified', record.userId, 'user');
        return { message: 'Phone verified successfully' };
    }
    async forgotPassword(email) {
        const user = await this.usersService.findByEmail(email);
        if (user) {
            const rawToken = (0, uuid_1.v4)();
            const tokenHash = this.hashToken(rawToken);
            const expiresMinutes = this.configService.get('app.passwordResetExpiryMinutes', 15);
            const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
            await this.passwordResetRepo.save({ userId: user.id, tokenHash, expiresAt });
            const frontendUrl = this.configService.get('app.frontendUrl', 'http://localhost:3001');
            const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
            this.logger.log(`[PASSWORD RESET] Email sent to: ${email} | Token hash: ${tokenHash.substring(0, 8)}... | Expires: ${expiresAt.toTimeString().split(' ')[0]}`);
            await this.sendPasswordResetEmail(user, resetUrl);
        }
        return { message: 'If that email is registered, a reset link has been sent.' };
    }
    async resetPassword(token, newPassword) {
        const tokenHash = this.hashToken(token);
        const record = await this.passwordResetRepo.findOne({
            where: { tokenHash, usedAt: (0, typeorm_2.IsNull)(), expiresAt: (0, typeorm_2.MoreThan)(new Date()) },
        });
        if (!record) {
            const expired = await this.passwordResetRepo.findOne({ where: { tokenHash } });
            if (expired && expired.expiresAt < new Date()) {
                throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_RESET_TOKEN_EXPIRED, message: 'Reset token has expired' });
            }
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_RESET_TOKEN_INVALID, message: 'Invalid reset token' });
        }
        const rounds = this.configService.get('app.bcryptRounds', 12);
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
    async mfaSetup(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        if (user.mfaEnabled) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_MFA_ALREADY_ENABLED, message: 'MFA is already enabled' });
        }
        const appName = this.configService.get('app.mfa.appName', 'RMC Platform');
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
    async mfaVerifySetup(userId, totp) {
        const encryptedSecret = await this.redis.get(`mfa_setup:${userId}`);
        if (!encryptedSecret) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_MFA_SETUP_NOT_INITIATED, message: 'MFA setup not initiated. Call /mfa/setup first.' });
        }
        const secret = this.decryptMfaSecret(encryptedSecret);
        const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: totp, window: 1 });
        if (!valid) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_MFA_INVALID_CODE, message: 'Invalid TOTP code' });
        }
        await this.usersService.update(userId, { mfaSecret: encryptedSecret, mfaEnabled: true });
        await this.redis.del(`mfa_setup:${userId}`);
        await this.writeAuditLog('user', userId, 'mfa_enabled', userId, 'user');
        return { message: 'MFA enabled successfully' };
    }
    async mfaDisable(userId, password, totp) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        if (!(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_INVALID_CREDENTIALS, message: 'Invalid password' });
        }
        this.verifyTotp(user, totp);
        await this.usersService.update(userId, { mfaEnabled: false, mfaSecret: null });
        await this.writeAuditLog('user', userId, 'mfa_disabled', userId, 'user');
        return { message: 'MFA disabled successfully' };
    }
    async twoFactorStatus(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        return {
            enabled: user.twoFactorEnabled,
            maskedPhone: user.twoFactorEnabled ? this.maskPhone(user.phone) : null,
        };
    }
    async twoFactorSetup(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        if (user.twoFactorEnabled) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_2FA_ALREADY_ENABLED, message: '2FA is already enabled' });
        }
        const expiresAt = await this.send2faOtp(userId, user.phone, '2fa_setup_otp');
        return { message: 'OTP sent to your phone', maskedPhone: this.maskPhone(user.phone), expiresAt };
    }
    async twoFactorVerifySetup(userId, otp) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        if (user.twoFactorEnabled) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_2FA_ALREADY_ENABLED, message: '2FA is already enabled' });
        }
        await this.verify2faOtp(userId, otp, '2fa_setup_otp');
        await this.usersService.update(userId, { twoFactorEnabled: true });
        await this.writeAuditLog('user', userId, 'two_factor_enabled', userId, 'user');
        return { message: '2-Step Verification enabled successfully' };
    }
    async twoFactorDisable(userId, password) {
        const user = await this.usersService.findByIdRaw(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        if (!user.twoFactorEnabled) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_2FA_NOT_ENABLED, message: '2FA is not enabled' });
        }
        if (!(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_INVALID_CREDENTIALS, message: 'Invalid password' });
        }
        await this.usersService.update(userId, { twoFactorEnabled: false });
        await this.writeAuditLog('user', userId, 'two_factor_disabled', userId, 'user');
        return { message: '2-Step Verification disabled successfully' };
    }
    async twoFactorVerifyLogin(tempToken, otp, ipAddress, userAgent) {
        const userId = this.verify2faTempToken(tempToken);
        await this.verify2faOtp(userId, otp, '2fa_login_otp');
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_INVALID_CREDENTIALS, message: 'User not found' });
        const result = await this.completLogin(user, ipAddress, userAgent);
        return result;
    }
    async twoFactorResend(tempToken) {
        const userId = this.verify2faTempToken(tempToken);
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        const expiresAt = await this.send2faOtp(userId, user.phone, '2fa_login_otp');
        return { message: 'OTP resent', maskedPhone: this.maskPhone(user.phone), expiresAt };
    }
    async getProfile(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        const { passwordHash, mfaSecret, ...safe } = user;
        const member = await this.memberProfileRepo.findOne({ where: { userId } });
        return {
            ...safe,
            membershipNumber: member?.membershipNumber ?? undefined,
            joinedDate: member?.joinedDate ?? undefined,
        };
    }
    async updateProfile(userId, dto) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        const updated = await this.usersService.updateProfile(userId, dto);
        const { passwordHash, mfaSecret, ...safe } = updated;
        return safe;
    }
    async changePassword(userId, dto) {
        const user = await this.usersService.findByIdRaw(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_INVALID_CREDENTIALS, message: 'Current password is incorrect' });
        }
        const rounds = this.configService.get('app.bcryptRounds', 12);
        const passwordHash = await bcrypt.hash(dto.newPassword, rounds);
        await this.usersService.update(userId, { passwordHash });
        await this.revokeAllUserTokens(userId);
        await this.writeAuditLog('user', userId, 'password_changed', userId, 'user');
        await this.sendPasswordChangedEmail(user);
        return { message: 'Password changed successfully. Please log in again.' };
    }
    async validateJwtPayload(payload) {
        const user = await this.usersService.findById(payload.sub);
        if (!user || user.status === 'inactive' || user.status === 'suspended') {
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_INVALID_CREDENTIALS, message: 'User not found or inactive' });
        }
        return Object.assign(user, { permissions: payload.permissions ?? [] });
    }
    async loadUserPermissions(user) {
        if (user.role === 'superadmin')
            return ['*'];
        if (!user.roleId)
            return [];
        const role = await this.roleRepo.findOne({ where: { id: user.roleId } });
        return role?.permissions ?? [];
    }
    async issueTokens(user, ipAddress, userAgent) {
        const permissions = await this.loadUserPermissions(user);
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            roleId: user.roleId,
            permissions,
        };
        const accessToken = this.jwtService.sign(payload);
        const rawRefreshToken = (0, uuid_1.v4)();
        const tokenHash = this.hashToken(rawRefreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.refreshTokenRepo.save({ userId: user.id, tokenHash, expiresAt, ipAddress, userAgent });
        return { accessToken, refreshToken: rawRefreshToken };
    }
    async revokeAllUserTokens(userId) {
        await this.refreshTokenRepo
            .createQueryBuilder()
            .update()
            .set({ revokedAt: new Date() })
            .where('user_id = :userId AND revoked_at IS NULL', { userId })
            .execute();
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    encryptMfaSecret(plaintext) {
        const key = crypto.scryptSync(this.configService.get('jwt.accessSecret', 'dev-secret'), 'rmc-salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }
    decryptMfaSecret(ciphertext) {
        const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
        const key = crypto.scryptSync(this.configService.get('jwt.accessSecret', 'dev-secret'), 'rmc-salt', 32);
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(encrypted) + decipher.final('utf8');
    }
    verifyTotp(user, code) {
        if (!user.mfaSecret) {
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_MFA_INVALID_CODE, message: 'MFA not configured' });
        }
        const secret = this.decryptMfaSecret(user.mfaSecret);
        const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
        if (!valid) {
            throw new common_1.UnauthorizedException({ code: error_codes_enum_1.ErrorCode.AUTH_MFA_INVALID_CODE, message: 'Invalid MFA code' });
        }
    }
    async generateMembershipNumber() {
        const year = new Date().getFullYear();
        const key = `membership_counter:${year}`;
        const seq = await this.redis.incr(key);
        return `RMC-${year}-${seq.toString().padStart(6, '0')}`;
    }
    async writeAuditLog(entityType, entityId, action, actorId, actorRole) {
        await this.auditLogRepo.save({
            entityType,
            entityId,
            action,
            actorId,
            actorRole,
            performedAt: new Date(),
        });
    }
    async sendWelcomeEmail(user) {
        if (!this.notifSettings.isEmailEnabled('auth.welcome_email'))
            return;
        try {
            const transporter = this.createMailTransporter();
            await transporter.sendMail({
                from: this.configService.get('app.smtp.from'),
                to: user.email,
                subject: 'Welcome to RMC Platform',
                html: `
          <h1>Welcome to the RMC Digital Platform, ${user.firstName}!</h1>
          <p>Your account has been created successfully.</p>
          <p>Next step: Please verify your phone number to complete your registration.</p>
          <p>Thank you for joining the Rwanda Muslim Community.</p>
        `,
            });
        }
        catch (err) {
            this.logger.error(`Failed to send welcome email to ${user.email}: ${err}`);
        }
    }
    async sendPasswordResetEmail(user, resetUrl) {
        if (!this.notifSettings.isEmailEnabled('auth.password_reset'))
            return;
        try {
            const transporter = this.createMailTransporter();
            await transporter.sendMail({
                from: this.configService.get('app.smtp.from'),
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
        }
        catch (err) {
            this.logger.error(`Failed to send password reset email: ${err}`);
        }
    }
    async sendPasswordChangedEmail(user) {
        if (!this.notifSettings.isEmailEnabled('auth.password_changed'))
            return;
        try {
            const transporter = this.createMailTransporter();
            await transporter.sendMail({
                from: this.configService.get('app.smtp.from'),
                to: user.email,
                subject: 'RMC Platform — Password Changed',
                html: `
          <h1>Password Changed</h1>
          <p>Hello ${user.firstName},</p>
          <p>Your password has been changed successfully.</p>
          <p>If you did not make this change, please contact support immediately.</p>
        `,
            });
        }
        catch (err) {
            this.logger.error(`Failed to send password changed email: ${err}`);
        }
    }
    async issue2faTempToken(userId) {
        return this.jwtService.sign({ sub: userId, stage: 'pending_2fa' }, { expiresIn: '5m' });
    }
    verify2faTempToken(tempToken) {
        try {
            const payload = this.jwtService.verify(tempToken);
            if (payload.stage !== 'pending_2fa')
                throw new Error('wrong stage');
            return payload.sub;
        }
        catch {
            throw new common_1.UnauthorizedException({
                code: error_codes_enum_1.ErrorCode.AUTH_2FA_TEMP_TOKEN_INVALID,
                message: 'Invalid or expired 2FA session. Please log in again.',
            });
        }
    }
    async send2faOtp(userId, phone, purpose) {
        const rateKey = `${purpose}_rate:${userId}`;
        const count = await this.redis.incr(rateKey);
        if (count === 1)
            await this.redis.expire(rateKey, 600);
        if (count > 3) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_2FA_OTP_RATE_LIMITED, message: 'Too many OTP requests. Try again in 10 minutes.' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const ttlSeconds = this.configService.get('app.otpExpiryMinutes', 5) * 60;
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        await this.redis.setex(`${purpose}:${userId}`, ttlSeconds, JSON.stringify({ hash: otpHash, attempts: 0 }));
        this.logger.log(`[2FA OTP] userId=${userId} | phone=${phone} | code=${otp} | expires=${expiresAt.toTimeString().split(' ')[0]}`);
        if (this.notifSettings.isSmsEnabled('auth.otp_sms')) {
            void this.smsService.sendSms(phone, `RMC Platform: Your verification code is ${otp}. Valid for 5 minutes. Do not share it.`);
        }
        return expiresAt;
    }
    async verify2faOtp(userId, otp, purpose) {
        const raw = await this.redis.get(`${purpose}:${userId}`);
        if (!raw) {
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_2FA_SETUP_NOT_INITIATED, message: 'OTP not found or expired. Request a new one.' });
        }
        const stored = JSON.parse(raw);
        if (stored.attempts >= 5) {
            await this.redis.del(`${purpose}:${userId}`);
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_OTP_MAX_ATTEMPTS, message: 'Maximum attempts exceeded. Request a new code.' });
        }
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        if (otpHash !== stored.hash) {
            stored.attempts += 1;
            const ttl = await this.redis.ttl(`${purpose}:${userId}`);
            if (ttl > 0) {
                await this.redis.setex(`${purpose}:${userId}`, ttl, JSON.stringify(stored));
            }
            throw new common_1.BadRequestException({ code: error_codes_enum_1.ErrorCode.AUTH_2FA_INVALID_CODE, message: 'Invalid verification code' });
        }
        await this.redis.del(`${purpose}:${userId}`);
    }
    maskPhone(phone) {
        if (!phone || phone.length < 6)
            return phone;
        return phone.slice(0, 4) + '****' + phone.slice(-2);
    }
    createMailTransporter() {
        const user = this.configService.get('app.smtp.user');
        return nodemailer.createTransport({
            host: this.configService.get('app.smtp.host', 'localhost'),
            port: this.configService.get('app.smtp.port', 1025),
            secure: this.configService.get('app.smtp.secure', false),
            auth: user ? { user, pass: this.configService.get('app.smtp.pass') } : undefined,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __param(4, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __param(5, (0, typeorm_1.InjectRepository)(phone_otp_verification_entity_1.PhoneOtpVerification)),
    __param(6, (0, typeorm_1.InjectRepository)(member_profile_entity_1.MemberProfile)),
    __param(7, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(8, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __param(9, (0, inject_redis_decorator_1.InjectRedis)()),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Function, notification_settings_service_1.NotificationSettingsService,
        sms_service_1.SmsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map