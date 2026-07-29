import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { TendersService } from './tenders.service';
import {
  PublicUploadService,
  type UploadedDocument,
} from '../integrations/storage/public-upload.service';
import { BID_DOCUMENT_FOLDER, BID_DOCUMENT_MAX_BYTES, BID_DOCUMENT_RULES } from './bid-documents';
import { sendInlineFile } from '../common/utils/send-file';
import { CreateTenderApplicationDto } from './dto/create-tender-application.dto';
import { UpdateTenderApplicationDto } from './dto/update-tender-application.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Bidder-facing endpoints. Auth is implicit — JwtAuthGuard is registered
 * globally in app.module, so every route here requires a signed-in user, and
 * `user.id` scopes every lookup to the caller's own bids.
 *
 * The tenders themselves (the things being bid on) are served by the existing
 * public announcements endpoints (`GET /public/announcements?type=tender`) —
 * this controller only owns the applications.
 */
@ApiTags('Tenders — Applicant')
@Controller('tenders')
@ApiBearerAuth()
export class TendersController {
  constructor(
    private readonly service: TendersService,
    private readonly storage: PublicUploadService,
  ) {}

  /**
   * Upload one bid document. Goes through the backend rather than straight to the
   * file server so the folder and the type/size rules are decided here, not by
   * whatever the browser cares to send — the same reason the anonymous tracking
   * upload exists. The key is only meaningful once a create/update references it.
   */
  @Post('applications/documents')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a bid document (PDF or image)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: BID_DOCUMENT_MAX_BYTES } }))
  uploadDocument(@UploadedFile() file: UploadedDocument | undefined) {
    return this.storage.upload(file, BID_DOCUMENT_FOLDER, BID_DOCUMENT_RULES);
  }

  @Post('applications')
  @ApiOperation({ summary: 'Submit a bid for a tender' })
  create(@CurrentUser() user: User, @Body() dto: CreateTenderApplicationDto) {
    return this.service.create(user.id, dto);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List own tender applications' })
  listOwn(@CurrentUser() user: User) {
    return this.service.listOwn(user.id);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get own tender application detail' })
  findOwn(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwn(id, user.id);
  }

  /**
   * Stream one of the bidder's own attachments. Bid documents live under a
   * protected file-server prefix, so a direct link no longer resolves — this is
   * how the "my bids" page opens them.
   */
  @Get('applications/:id/documents/:documentId/file')
  @ApiOperation({ summary: 'Download an attachment on own bid' })
  async ownDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { fileName, buffer, mimeType } = await this.service.getOwnDocument(
      id,
      documentId,
      user.id,
    );
    sendInlineFile(res, fileName, buffer, mimeType);
  }

  @Patch('applications/:id')
  @ApiOperation({ summary: 'Update a submitted or more-info-requested bid' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenderApplicationDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Post('applications/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw a bid' })
  withdraw(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.withdraw(id, user.id);
  }
}
