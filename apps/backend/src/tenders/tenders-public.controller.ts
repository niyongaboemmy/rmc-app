import { Controller, Post, Get, Body, Ip, Headers, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TendersService } from './tenders.service';
import { TrackingVerificationService } from '../tracking/tracking-verification.service';
import { RequestTrackingOtpDto, VerifyTrackingOtpDto } from '../tracking/dto/tracking-otp.dto';
import { Public } from '../common/decorators/public.decorator';

const TENDER_SUBJECT = 'tender_application';

/**
 * Public, phone-OTP-gated tracking for a tender bid — so a bidder can check their
 * status from the tenders page without signing in. The bid reference alone
 * reveals nothing: the requester must prove control of the phone on the bid via
 * an SMS OTP (shared TrackingVerificationService). Mirrors the Hajj tracking
 * routes; the authenticated bidder endpoints live in TendersController.
 */
@ApiTags('Tenders — Public tracking')
@Controller('tenders')
export class TendersPublicController {
  constructor(
    private readonly service: TendersService,
    private readonly tracking: TrackingVerificationService,
  ) {}

  @Post('applications/track/request-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @ApiOperation({ summary: 'Request an SMS OTP to the phone on file for this bid reference' })
  async requestTrackingOtp(@Body() dto: RequestTrackingOtpDto, @Ip() ip: string) {
    const subject = await this.service.findSubjectByCode(dto.trackingCode);
    return this.tracking.requestOtp(TENDER_SUBJECT, subject, ip);
  }

  @Post('applications/track/verify-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @ApiOperation({ summary: 'Verify the OTP; returns a short-lived token + status' })
  async verifyTrackingOtp(@Body() dto: VerifyTrackingOtpDto, @Ip() ip: string) {
    const subject = await this.service.findSubjectByCode(dto.trackingCode);
    const { token, subjectId } = await this.tracking.verifyOtp(TENDER_SUBJECT, subject, dto.otp, ip);
    const info = await this.service.getTrackingInfo(subjectId);
    return { token, ...info };
  }

  @Get('applications/track/session')
  @Public()
  @ApiOperation({ summary: 'Refresh status using a valid tracking token (Authorization: Bearer)' })
  async trackingSession(@Headers('authorization') authHeader?: string) {
    const token = (authHeader || '').replace(/^Bearer\s+/i, '');
    const id = this.tracking.verifyToken(token, TENDER_SUBJECT);
    return this.service.getTrackingInfo(id);
  }
}
