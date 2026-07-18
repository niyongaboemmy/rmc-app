import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { HajjService } from './hajj.service';
import { HajjRequirementService } from './hajj-requirement.service';
import { HajjBankAccountService } from './hajj-bank-account.service';
import {
  PublicUploadService,
  type UploadedDocument,
} from '../integrations/storage/public-upload.service';
import { CreateHajjApplicationDto } from './dto/create-hajj-application.dto';
import { TrackingVerificationService } from '../tracking/tracking-verification.service';
import { RequestTrackingOtpDto, VerifyTrackingOtpDto } from '../tracking/dto/tracking-otp.dto';
import { Public } from '../common/decorators/public.decorator';

const HAJJ_SUBJECT = 'hajj_application';

/** Must stay listed in the file server's PROTECTED_KEY_PREFIXES. */
const HAJJ_PROOF_FOLDER = 'hajj-proofs';

@ApiTags('Hajj — Public')
@Controller('hajj')
export class HajjController {
  constructor(
    private readonly service: HajjService,
    private readonly requirements: HajjRequirementService,
    private readonly bankAccounts: HajjBankAccountService,
    private readonly storage: PublicUploadService,
    private readonly tracking: TrackingVerificationService,
  ) {}

  /**
   * The requirements checklist rendered on the Hajj landing page and the fee
   * amounts shown on the registration form. Active rows only — a deactivated
   * requirement stays in the CMS but leaves the public page.
   */
  @Get('requirements')
  @Public()
  @ApiOperation({ summary: 'Hajj requirements shown on the public page' })
  listRequirements() {
    return this.requirements.findAllDto(true);
  }

  /**
   * The bank accounts the Hajj fees are paid into. Active rows only, and empty
   * until an admin enters the real ones — a fabricated account number on a
   * public payment page is worse than no account number at all.
   */
  @Get('bank-accounts')
  @Public()
  @ApiOperation({ summary: 'Hajj bank accounts shown on the public page' })
  listBankAccounts() {
    return this.bankAccounts.findAllDto(true);
  }

  /**
   * Upload one payment receipt. Anonymous, so it is rate-limited and the service
   * validates type/size before forwarding to the file server — we never expose the
   * file server's own upload route to unauthenticated callers.
   */
  @Post('proofs')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a Hajj payment receipt (image or PDF)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadProof(@UploadedFile() file: UploadedDocument | undefined) {
    return this.storage.upload(file, HAJJ_PROOF_FOLDER);
  }

  @Post('apply')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a Hajj application' })
  async apply(@Body() dto: CreateHajjApplicationDto) {
    const app = await this.service.apply(dto);
    // Only what the applicant needs — the rest of the row is not public. The
    // trackingCode is the credential they use (with their phone) to track it.
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      trackingCode: app.trackingCode,
      status: app.status,
    };
  }

  // ── Secure public tracking (phone-OTP gated) ─────────────────────────────────

  @Post('applications/track/request-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @ApiOperation({ summary: 'Request an SMS OTP to the phone on file for this tracking code' })
  async requestTrackingOtp(@Body() dto: RequestTrackingOtpDto, @Ip() ip: string) {
    const subject = await this.service.findSubjectByCode(dto.trackingCode);
    return this.tracking.requestOtp(HAJJ_SUBJECT, subject, ip);
  }

  @Post('applications/track/verify-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  @ApiOperation({ summary: 'Verify the OTP; returns a short-lived token + status' })
  async verifyTrackingOtp(@Body() dto: VerifyTrackingOtpDto, @Ip() ip: string) {
    const subject = await this.service.findSubjectByCode(dto.trackingCode);
    const { token, subjectId } = await this.tracking.verifyOtp(HAJJ_SUBJECT, subject, dto.otp, ip);
    const info = await this.service.getTrackingInfo(subjectId);
    return { token, ...info };
  }

  @Get('applications/track/session')
  @Public()
  @ApiOperation({ summary: 'Refresh status using a valid tracking token (Authorization: Bearer)' })
  async trackingSession(@Headers('authorization') authHeader?: string) {
    const token = (authHeader || '').replace(/^Bearer\s+/i, '');
    const id = this.tracking.verifyToken(token, HAJJ_SUBJECT);
    return this.service.getTrackingInfo(id);
  }
}
