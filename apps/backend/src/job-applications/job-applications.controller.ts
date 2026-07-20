import {
  Controller, Get, Post, Param, Body, Query, ParseUUIDPipe, Ip, Headers, HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobApplicationsService } from './job-applications.service';
import { TrackingVerificationService } from './tracking-verification.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { RespondMoreInfoDto } from './dto/respond-more-info.dto';
import { RequestTrackingOtpDto, VerifyTrackingOtpDto } from './dto/tracking-otp.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Job Applications — Member')
@ApiBearerAuth()
@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly service: JobApplicationsService,
    private readonly tracking: TrackingVerificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit a job application' })
  create(@CurrentUser() user: User, @Body() dto: CreateJobApplicationDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List own job applications' })
  listOwn(@CurrentUser() user: User, @Query('status') status?: string) {
    return this.service.listOwn(user.id, { status });
  }

  // ── Secure public tracking (phone-OTP gated) ─────────────────────────────────

  @Post('track/request-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @ApiOperation({ summary: 'Request an SMS OTP to the phone on file for this tracking code' })
  async requestTrackingOtp(@Body() dto: RequestTrackingOtpDto, @Ip() ip: string) {
    return this.tracking.requestOtp(dto.trackingCode, ip);
  }

  @Post('track/verify-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @ApiOperation({ summary: 'Verify the OTP; returns a short-lived tracking token + status' })
  async verifyTrackingOtp(@Body() dto: VerifyTrackingOtpDto, @Ip() ip: string) {
    const { token, applicationId } = await this.tracking.verifyOtp(dto.trackingCode, dto.otp, ip);
    const info = await this.service.getTrackingInfo(applicationId);
    return { token, ...info };
  }

  @Get('track/session')
  @Public()
  @ApiOperation({ summary: 'Refresh status using a valid tracking token (Authorization: Bearer)' })
  async trackingSession(@Headers('authorization') authHeader?: string) {
    const token = (authHeader || '').replace(/^Bearer\s+/i, '');
    const applicationId = this.tracking.verifyToken(token);
    return this.service.getTrackingInfo(applicationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get own job application details' })
  findOwn(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwn(id, user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a submitted or under-review application' })
  cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id, user.id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Reply to a reviewer\'s request for more information' })
  respond(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondMoreInfoDto,
  ) {
    return this.service.respondToMoreInfo(id, user.id, dto);
  }
}
