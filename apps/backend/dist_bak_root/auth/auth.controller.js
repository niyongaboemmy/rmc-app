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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const send_otp_dto_1 = require("./dto/send-otp.dto");
const verify_phone_dto_1 = require("./dto/verify-phone.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const mfa_verify_setup_dto_1 = require("./dto/mfa-verify-setup.dto");
const two_factor_dto_1 = require("./dto/two-factor.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const user_entity_1 = require("../users/entities/user.entity");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async register(dto) {
        return this.authService.register(dto);
    }
    async login(dto, req) {
        const ip = req.ip;
        const ua = req.headers['user-agent'];
        return this.authService.login(dto, ip, ua);
    }
    async refresh(dto) {
        return this.authService.refreshTokens(dto.refreshToken);
    }
    async logout(user, body) {
        return this.authService.logout(user.id, body.refreshToken);
    }
    async sendOtp(dto) {
        return this.authService.sendOtp(dto.phone);
    }
    async verifyPhone(dto) {
        return this.authService.verifyPhone(dto.phone, dto.otp);
    }
    async forgotPassword(dto) {
        return this.authService.forgotPassword(dto.email);
    }
    async resetPassword(dto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }
    getProfile(user) {
        return this.authService.getProfile(user.id);
    }
    updateProfile(user, dto) {
        return this.authService.updateProfile(user.id, dto);
    }
    changePassword(user, dto) {
        return this.authService.changePassword(user.id, dto);
    }
    async mfaSetup(user) {
        return this.authService.mfaSetup(user.id);
    }
    async mfaVerifySetup(user, dto) {
        return this.authService.mfaVerifySetup(user.id, dto.totp);
    }
    async mfaDisable(user, dto) {
        return this.authService.mfaDisable(user.id, dto.password, dto.totp);
    }
    async twoFactorStatus(user) {
        return this.authService.twoFactorStatus(user.id);
    }
    async twoFactorSetup(user) {
        return this.authService.twoFactorSetup(user.id);
    }
    async twoFactorVerifySetup(user, dto) {
        return this.authService.twoFactorVerifySetup(user.id, dto.otp);
    }
    async twoFactorDisable(user, dto) {
        return this.authService.twoFactorDisable(user.id, dto.password);
    }
    async twoFactorVerifyLogin(dto, req) {
        return this.authService.twoFactorVerifyLogin(dto.tempToken, dto.otp, req.ip, req.headers['user-agent']);
    }
    async twoFactorResend(dto) {
        return this.authService.twoFactorResend(dto.tempToken);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user', description: 'Creates a new user account and sends a welcome email. Phone must be in Rwanda format (+250XXXXXXXXX).' }),
    (0, swagger_1.ApiBody)({ type: register_dto_1.RegisterDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User registered successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email or phone already registered' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login', description: 'Authenticate with email or phone + password. Returns access and refresh tokens.' }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login successful or MFA required' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Account suspended or inactive' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many failed attempts' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token', description: 'Exchange a valid refresh token for a new access + refresh token pair (token rotation).' }),
    (0, swagger_1.ApiBody)({ type: refresh_token_dto_1.RefreshTokenDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'New tokens issued' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired refresh token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Logout', description: 'Revoke the refresh token and log out.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logged out successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Not authenticated' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Send phone OTP', description: 'Send a 6-digit OTP to the user\'s phone for verification. In dev mode, OTP is logged to console.' }),
    (0, swagger_1.ApiBody)({ type: send_otp_dto_1.SendOtpDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'OTP rate limit exceeded' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_otp_dto_1.SendOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-phone'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify phone OTP', description: 'Verify the 6-digit OTP sent to the user\'s phone.' }),
    (0, swagger_1.ApiBody)({ type: verify_phone_dto_1.VerifyPhoneDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Phone verified successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid, expired, or max attempts OTP' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_phone_dto_1.VerifyPhoneDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyPhone", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset', description: 'Send a password reset email. Always returns 200 to prevent user enumeration.' }),
    (0, swagger_1.ApiBody)({ type: forgot_password_dto_1.ForgotPasswordDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reset email sent (or silently skipped for non-existent email)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password', description: 'Reset the user\'s password using the token from the reset email. Token is single-use and expires in 15 minutes.' }),
    (0, swagger_1.ApiBody)({ type: reset_password_dto_1.ResetPasswordDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password reset successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid, expired, or used reset token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)('profile'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('change-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Change password (requires current password)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Password changed — all sessions revoked' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Current password incorrect' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('mfa/setup'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate MFA setup', description: 'Generate a TOTP secret and QR code for authenticator app setup. Must confirm with /mfa/verify-setup.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'QR code and manual entry code returned' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'MFA already enabled' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaSetup", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('mfa/verify-setup'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm MFA setup', description: 'Verify the TOTP code from the authenticator app and enable MFA.' }),
    (0, swagger_1.ApiBody)({ type: mfa_verify_setup_dto_1.MfaVerifySetupDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'MFA enabled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid TOTP code or setup not initiated' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        mfa_verify_setup_dto_1.MfaVerifySetupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaVerifySetup", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('mfa/disable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Disable MFA', description: 'Disable MFA. Requires current password and TOTP code for security.' }),
    (0, swagger_1.ApiBody)({ type: mfa_verify_setup_dto_1.MfaDisableDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'MFA disabled successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid password or TOTP' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        mfa_verify_setup_dto_1.MfaDisableDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "mfaDisable", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('2fa/status'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get 2FA status' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "twoFactorStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('2fa/setup'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate 2FA setup', description: 'Send an OTP to the user\'s phone to begin 2FA enrollment.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent to phone' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: '2FA already enabled' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "twoFactorSetup", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('2fa/verify-setup'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm 2FA setup', description: 'Verify the OTP and enable 2-Step Verification.' }),
    (0, swagger_1.ApiBody)({ type: two_factor_dto_1.TwoFactorVerifySetupDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '2FA enabled' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        two_factor_dto_1.TwoFactorVerifySetupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "twoFactorVerifySetup", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('2fa/disable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Disable 2FA', description: 'Disable 2-Step Verification. Requires current password.' }),
    (0, swagger_1.ApiBody)({ type: two_factor_dto_1.TwoFactorDisableDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '2FA disabled' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        two_factor_dto_1.TwoFactorDisableDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "twoFactorDisable", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('2fa/verify-login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Complete 2FA login', description: 'Submit the SMS OTP to complete the 2-step login flow.' }),
    (0, swagger_1.ApiBody)({ type: two_factor_dto_1.TwoFactorVerifyLoginDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Full tokens issued' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired temp token' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid OTP' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [two_factor_dto_1.TwoFactorVerifyLoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "twoFactorVerifyLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('2fa/resend'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resend 2FA login OTP', description: 'Re-send the SMS OTP during a pending 2FA login. Rate limited to 3 per 10 minutes.' }),
    (0, swagger_1.ApiBody)({ type: two_factor_dto_1.TwoFactorResendDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP resent' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [two_factor_dto_1.TwoFactorResendDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "twoFactorResend", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map