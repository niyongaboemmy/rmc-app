import {
  Controller, Get, Post, Body, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import {
  PublicUploadService,
  type UploadedDocument,
} from '../integrations/storage/public-upload.service';
import { FuneralService } from './funeral.service';
import { CemeteryService } from './cemetery.service';
import { FuneralStepService } from './funeral-step.service';
import { FuneralTransportService } from './funeral-transport.service';
import { CreateFuneralRequestDto } from './dto/create-funeral-request.dto';
import { Public } from '../common/decorators/public.decorator';

/** Must stay listed in the file server's PROTECTED_KEY_PREFIXES. */
const FUNERAL_DOC_FOLDER = 'funeral-docs';

@ApiTags('Funeral')
@Controller('funeral')
export class FuneralController {
  constructor(
    private readonly service: FuneralService,
    private readonly cemeteries: CemeteryService,
    private readonly steps: FuneralStepService,
    private readonly transports: FuneralTransportService,
    private readonly storage: PublicUploadService,
  ) {}

  /**
   * Upload a death certificate. Anonymous (a grieving family is not logged in), so
   * it is rate-limited and the file is validated before being forwarded to the file
   * server under a service token — the file server's own upload route stays closed.
   */
  @Post('documents')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a death certificate (image or PDF)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadDocument(@UploadedFile() file: UploadedDocument | undefined) {
    return this.storage.upload(file, FUNERAL_DOC_FOLDER);
  }

  @Get('steps')
  @Public()
  @ApiOperation({ summary: 'List active funeral lifecycle steps (public timeline)' })
  listSteps() {
    return this.steps.findAllDto(true);
  }

  @Get('cemeteries')
  @Public()
  @ApiOperation({ summary: 'List cemeteries (public directory)' })
  listCemeteries() {
    return this.cemeteries.findAll();
  }

  @Get('transports')
  @Public()
  @ApiOperation({ summary: 'List active funeral transport means (public directory)' })
  listTransports() {
    return this.transports.findAll({ activeOnly: true });
  }

  @Post('requests')
  @Public()
  @ApiOperation({ summary: 'Submit a new funeral service request' })
  submit(@Body() dto: CreateFuneralRequestDto) {
    return this.service.submit(dto);
  }
}
