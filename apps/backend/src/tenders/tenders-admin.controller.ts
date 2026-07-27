import { Controller, Get, Patch, Param, Body, Query, Res, ParseUUIDPipe } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { TendersService } from './tenders.service';
import { sendInlineFile } from '../common/utils/send-file';
import { UpdateTenderApplicationStatusDto } from './dto/update-tender-application-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';

class VerifyDocumentDto {
  @IsBoolean()
  verified!: boolean;
}

@ApiTags('Tenders — Admin')
@Controller('admin/tenders')
@ApiBearerAuth()
export class TendersAdminController {
  constructor(private readonly service: TendersService) {}

  @Get('applications')
  @Permissions(Permission.TENDER_VIEW)
  @ApiOperation({ summary: 'List all tender applications' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tenderId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('tenderId') tenderId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminList({
      status,
      tenderId,
      search,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('applications/:id')
  @Permissions(Permission.TENDER_VIEW)
  @ApiOperation({ summary: 'Get full application detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGetById(id);
  }

  @Patch('applications/:id/status')
  @Permissions(Permission.TENDER_EVALUATE)
  @ApiOperation({ summary: 'Start review / request more info / shortlist / award / reject' })
  updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenderApplicationStatusDto,
  ) {
    return this.service.adminUpdateStatus(id, user.id, dto);
  }

  /**
   * Stream a bid attachment. `tender-applications/` is a protected prefix on the
   * file server, so it will not serve these keys to a browser — this route is how
   * a reviewer opens a bidder's company registration, tax clearance or proposal.
   */
  @Get('applications/:id/documents/:documentId/file')
  @Permissions(Permission.TENDER_VIEW)
  @ApiOperation({ summary: 'Download/inspect a bid attachment' })
  async documentFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { fileName, buffer, mimeType } = await this.service.adminGetDocument(id, documentId);
    sendInlineFile(res, fileName, buffer, mimeType);
  }

  @Patch('applications/:id/documents/:documentId/verify')
  @Permissions(Permission.TENDER_MANAGE)
  @ApiOperation({ summary: 'Mark a submitted document as verified (or un-verify it)' })
  verifyDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: VerifyDocumentDto,
  ) {
    return this.service.adminVerifyDocument(id, documentId, user.id, dto.verified);
  }

  @Get('reports')
  @Permissions(Permission.TENDER_REPORTS)
  @ApiOperation({ summary: 'Get tender application statistics' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getReports(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.service.adminGetReports({ dateFrom, dateTo });
  }

  @Get('reports/export')
  @Permissions(Permission.TENDER_REPORTS)
  @ApiOperation({ summary: 'Export tender applications as CSV' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tenderId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async exportCsv(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('tenderId') tenderId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const csv = await this.service.adminExportCsv({
      status,
      tenderId,
      search,
      dateFrom,
      dateTo,
    });
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="tender-applications.csv"',
    });
    res.status(200).send(csv);
  }
}
