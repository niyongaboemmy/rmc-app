import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  Headers,
  HttpCode,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ScholarshipService } from './scholarship.service';
import { CreateScholarshipApplicationDto } from './dto/create-scholarship-application.dto';
import { SaveScholarshipDocumentDto } from './dto/save-scholarship-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { TrackingVerificationService } from '../tracking/tracking-verification.service';
import { RequestTrackingOtpDto, VerifyTrackingOtpDto } from '../tracking/dto/tracking-otp.dto';

/** Namespaces this service's OTPs and tokens, so a hajj token cannot open a scholarship. */
const SCHOLARSHIP_SUBJECT = 'scholarship_application';

@ApiTags('Scholarship — Member')
@Controller('scholarship')
export class ScholarshipController {
  constructor(
    private readonly service: ScholarshipService,
    private readonly tracking: TrackingVerificationService,
  ) {}

  @Get('programs')
  @Public()
  @ApiOperation({ summary: 'List published scholarships (open and closed; never drafts)' })
  listPrograms() {
    return this.service.listPrograms();
  }

  /**
   * Declared BEFORE `programs/:id` — that route's UUID pipe would otherwise
   * reject a slug outright.
   */
  @Get('programs/slug/:slug')
  @Public()
  @ApiOperation({ summary: 'One scholarship by its public slug (404 unless published)' })
  getProgramBySlug(@Param('slug') slug: string) {
    return this.service.getProgramBySlug(slug);
  }

  @Get('programs/:id')
  @Public()
  @ApiOperation({ summary: 'Get a scholarship program' })
  getProgram(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getProgram(id);
  }

  @Post('applications/draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a scholarship application draft' })
  createDraft(@CurrentUser() user: User, @Body() dto: CreateScholarshipApplicationDto) {
    return this.service.createDraft(user.id, dto);
  }

  @Put('applications/:id/draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft application' })
  updateDraft(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateScholarshipApplicationDto>,
  ) {
    return this.service.updateDraft(id, user.id, dto);
  }

  @Post('applications/:id/submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a draft application' })
  submit(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.submit(id, user.id);
  }

  @Post('applications/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a draft or submitted application' })
  cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id, user.id);
  }

  @Get('applications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own scholarship applications' })
  listOwn(@CurrentUser() user: User) {
    return this.service.listOwn(user.id);
  }

  // ── Secure public tracking (phone-OTP gated) ─────────────────────────────────
  //
  // Replaces `GET applications/by-number/:number`, which was @Public() and
  // returned the whole entity — national ID, date of birth, applicant and
  // guardian phones, the motivation essay — keyed on a SEQUENTIAL number. The
  // applicants are schoolchildren. See migration 051.
  //
  // Declared BEFORE `applications/:id`, or the UUID pipe on that route would
  // swallow `track` and reject it.

  @Post('applications/track/request-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @ApiOperation({ summary: 'Request an SMS OTP to the phone on file for this tracking code' })
  async requestTrackingOtp(@Body() dto: RequestTrackingOtpDto, @Ip() ip: string) {
    const subject = await this.service.findSubjectByCode(dto.trackingCode);
    return this.tracking.requestOtp(SCHOLARSHIP_SUBJECT, subject, ip);
  }

  @Post('applications/track/verify-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @ApiOperation({ summary: 'Verify the OTP; returns a short-lived token + status' })
  async verifyTrackingOtp(@Body() dto: VerifyTrackingOtpDto, @Ip() ip: string) {
    const subject = await this.service.findSubjectByCode(dto.trackingCode);
    const { token, subjectId } = await this.tracking.verifyOtp(
      SCHOLARSHIP_SUBJECT,
      subject,
      dto.otp,
      ip,
    );
    const info = await this.service.getTrackingInfo(subjectId);
    return { token, ...info };
  }

  @Get('applications/track/session')
  @Public()
  @ApiOperation({ summary: 'Refresh status using a valid tracking token (Authorization: Bearer)' })
  async trackingSession(@Headers('authorization') authHeader?: string) {
    const token = (authHeader || '').replace(/^Bearer\s+/i, '');
    const id = this.tracking.verifyToken(token, SCHOLARSHIP_SUBJECT);
    return this.service.getTrackingInfo(id);
  }

  @Get('applications/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own application details' })
  findOwn(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwn(id, user.id);
  }

  @Post('applications/:id/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach an uploaded supporting document to an application' })
  saveDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveScholarshipDocumentDto,
  ) {
    return this.service.saveDocument(id, user.id, dto);
  }

  @Delete('applications/:id/documents/:docId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a supporting document from an application' })
  deleteDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.service.deleteDocument(id, docId, user.id);
  }
}
