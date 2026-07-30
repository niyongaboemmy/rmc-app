import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Ip,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { TendersService } from './tenders.service';
import { TrackingVerificationService } from '../tracking/tracking-verification.service';
import { RequestTrackingOtpDto, VerifyTrackingOtpDto } from '../tracking/dto/tracking-otp.dto';
import { UpdateTenderApplicationDto } from './dto/update-tender-application.dto';
import {
  PublicUploadService,
  type UploadedDocument,
} from '../integrations/storage/public-upload.service';
import { Public } from '../common/decorators/public.decorator';
import { sendInlineFile } from '../common/utils/send-file';
import { BID_DOCUMENT_FOLDER, BID_DOCUMENT_MAX_BYTES, BID_DOCUMENT_RULES } from './bid-documents';

const TENDER_SUBJECT = 'tender_application';

/**
 * Public, phone-OTP-gated tracking for a tender bid — so a bidder can check their
 * status, read their own bid back and correct it from the tenders page without
 * signing in. The bid reference alone reveals nothing: the requester must prove
 * control of the phone on the bid via an SMS OTP (shared
 * TrackingVerificationService). Mirrors the Hajj tracking routes; the
 * authenticated bidder endpoints live in TendersController.
 *
 * Every route below that touches a specific bid resolves it from the tracking
 * TOKEN, never from a path parameter — so there is no id for a caller to swap.
 */
@ApiTags('Tenders — Public tracking')
@Controller('tenders')
export class TendersPublicController {
  constructor(
    private readonly service: TendersService,
    private readonly tracking: TrackingVerificationService,
    private readonly storage: PublicUploadService,
  ) {}

  /** The bid id behind a tracking token, or a 401 if it is missing, expired or wrong-typed. */
  private subjectFrom(authHeader?: string): string {
    return this.tracking.verifyToken((authHeader || '').replace(/^Bearer\s+/i, ''), TENDER_SUBJECT);
  }

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
    const { token, subjectId } = await this.tracking.verifyOtp(
      TENDER_SUBJECT,
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
    return this.service.getTrackingInfo(this.subjectFrom(authHeader));
  }

  /**
   * The bidder's own bid in full — everything they typed plus their attachments —
   * for the bid details page the tracking flow lands on.
   */
  @Get('applications/track/bid')
  @Public()
  @ApiOperation({ summary: 'Read the full bid behind a valid tracking token' })
  async trackingBid(@Headers('authorization') authHeader?: string) {
    return this.service.getTrackingBid(this.subjectFrom(authHeader));
  }

  /**
   * Correct a bid without logging in. The service re-checks that the bid is still
   * at an editable stage and its tender still open, so a stale page cannot push an
   * edit through after review has started or the deadline has passed.
   */
  @Patch('applications/track/bid')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @ApiOperation({ summary: 'Update the bid behind a valid tracking token' })
  async updateTrackingBid(
    @Body() dto: UpdateTenderApplicationDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.service.updateViaTracking(this.subjectFrom(authHeader), dto);
  }

  /**
   * Withdraw the bid behind the token. Terminal and self-inflicted, so the UI
   * confirms first; the service still refuses it once the bid is awarded.
   */
  @Post('applications/track/withdraw')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @ApiOperation({ summary: 'Withdraw the bid behind a valid tracking token' })
  async withdrawTrackingBid(@Headers('authorization') authHeader?: string) {
    return this.service.withdrawViaTracking(this.subjectFrom(authHeader));
  }

  /**
   * Upload one replacement attachment. Anonymous, so it is rate-limited and the
   * service validates type/size before forwarding to the file server under a
   * service token — the file server's own upload route is never exposed to
   * unauthenticated callers. The returned key is only meaningful once a
   * subsequent PATCH attaches it to the bid.
   */
  @Post('applications/track/documents')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a replacement bid document (PDF or image)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: BID_DOCUMENT_MAX_BYTES } }))
  uploadBidDocument(
    @UploadedFile() file: UploadedDocument | undefined,
    @Headers('authorization') authHeader?: string,
  ) {
    // Verified purely to keep the upload behind the OTP gate — the bid id itself
    // is not needed until the PATCH that references the stored key.
    this.subjectFrom(authHeader);
    return this.storage.upload(file, BID_DOCUMENT_FOLDER, BID_DOCUMENT_RULES);
  }

  /**
   * Stream one of the bid's own attachments. `tender-applications/` is protected
   * on the file server, so this is the only way a bidder can open a document they
   * uploaded. The lookup is scoped to the token's bid, so a document id belonging
   * to someone else's bid resolves to a 404.
   */
  @Get('applications/track/documents/:documentId')
  @Public()
  @ApiOperation({ summary: 'Download an attachment on the bid behind a tracking token' })
  async trackingDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
    @Headers('authorization') authHeader?: string,
  ): Promise<void> {
    const applicationId = this.subjectFrom(authHeader);
    const { fileName, buffer, mimeType } = await this.service.getTrackingDocument(
      applicationId,
      documentId,
    );
    sendInlineFile(res, fileName, buffer, mimeType);
  }
}
