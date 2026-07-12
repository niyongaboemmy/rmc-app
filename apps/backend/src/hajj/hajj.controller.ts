import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { Public } from '../common/decorators/public.decorator';

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
    // Only what the applicant needs — the rest of the row is not public.
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
    };
  }

  @Get('applications/by-number/:number')
  @Public()
  @ApiOperation({ summary: 'Look up an application status by its number' })
  async byNumber(@Param('number') number: string) {
    const app = await this.service.findByNumber(number);
    // Deliberately narrow: this route is unauthenticated, so it must not leak the
    // passport number, payment proofs or internal review notes.
    return {
      applicationNumber: app.applicationNumber,
      fullName: app.fullName,
      district: app.district,
      sector: app.sector,
      status: app.status,
      rejectionReason: app.rejectionReason,
      submittedAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }
}
