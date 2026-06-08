import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user', description: 'Creates a new user account and sends a welcome email. Phone must be in Rwanda format (+250XXXXXXXXX).' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email or phone already registered' })
  async register(@Body() dto: RegisterDto): Promise<{ userId: string; message: string }> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login', description: 'Authenticate with email or phone + password. Returns access and refresh tokens.' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful or MFA required' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account suspended or inactive' })
  @ApiResponse({ status: 429, description: 'Too many failed attempts' })
  async login(
    @Body() dto: LoginDto,
    @Request() req: ExpressRequest,
  ): Promise<unknown> {
    const ip = req.ip;
    const ua = req.headers['user-agent'];
    return this.authService.login(dto, ip, ua);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token', description: 'Exchange a valid refresh token for a new access + refresh token pair (token rotation).' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'New tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout', description: 'Revoke the refresh token and log out.' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async logout(
    @CurrentUser() user: User,
    @Body() body: { refreshToken?: string },
  ): Promise<{ message: string }> {
    return this.authService.logout(user.id, body.refreshToken);
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send phone OTP', description: 'Send a 6-digit OTP to the user\'s phone for verification. In dev mode, OTP is logged to console.' })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'OTP rate limit exceeded' })
  async sendOtp(@Body() dto: SendOtpDto): Promise<{ message: string; expiresAt: Date }> {
    return this.authService.sendOtp(dto.phone);
  }

  @Public()
  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone OTP', description: 'Verify the 6-digit OTP sent to the user\'s phone.' })
  @ApiBody({ type: VerifyPhoneDto })
  @ApiResponse({ status: 200, description: 'Phone verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid, expired, or max attempts OTP' })
  async verifyPhone(@Body() dto: VerifyPhoneDto): Promise<{ message: string }> {
    return this.authService.verifyPhone(dto.phone, dto.otp);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset', description: 'Send a password reset email. Always returns 200 to prevent user enumeration.' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset email sent (or silently skipped for non-existent email)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password', description: 'Reset the user\'s password using the token from the reset email. Token is single-use and expires in 15 minutes.' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid, expired, or used reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Initiate MFA setup', description: 'Generate a TOTP secret and QR code for authenticator app setup. Must confirm with /mfa/verify-setup.' })
  @ApiResponse({ status: 200, description: 'QR code and manual entry code returned' })
  @ApiResponse({ status: 400, description: 'MFA already enabled' })
  async mfaSetup(@CurrentUser() user: User): Promise<{ qrCodeDataUrl: string; manualEntryCode: string }> {
    return this.authService.mfaSetup(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/verify-setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Confirm MFA setup', description: 'Verify the TOTP code from the authenticator app and enable MFA.' })
  @ApiBody({ type: MfaVerifySetupDto })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code or setup not initiated' })
  async mfaVerifySetup(
    @CurrentUser() user: User,
    @Body() dto: MfaVerifySetupDto,
  ): Promise<{ message: string }> {
    return this.authService.mfaVerifySetup(user.id, dto.totp);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable MFA', description: 'Disable MFA. Requires current password and TOTP code for security.' })
  @ApiBody({ type: MfaDisableDto })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid password or TOTP' })
  async mfaDisable(
    @CurrentUser() user: User,
    @Body() dto: MfaDisableDto,
  ): Promise<{ message: string }> {
    return this.authService.mfaDisable(user.id, dto.password, dto.totp);
  }
}
