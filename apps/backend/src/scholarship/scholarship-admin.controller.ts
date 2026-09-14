import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { IsBoolean } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ScholarshipService } from './scholarship.service';
import { CreateScholarshipProgramDto } from './dto/create-scholarship-program.dto';
import { UpdateScholarshipProgramDto } from './dto/update-scholarship-program.dto';
import { UpdateScholarshipStatusDto } from './dto/update-scholarship-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';

class VerifyScholarshipDocumentDto {
  @IsBoolean()
  verified: boolean;
}

/** A query-string integer of at least 1, or the fallback for anything else. */
function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

@ApiTags('Scholarship — Admin')
@Controller('admin/scholarship')
@ApiBearerAuth()
export class ScholarshipAdminController {
  constructor(private readonly service: ScholarshipService) {}

  // ── Programs ─────────────────────────────────────────────────────────────

  @Get('programs')
  @Permissions(Permission.SCHOLARSHIP_VIEW)
  @ApiOperation({ summary: 'List all scholarship programs (including closed)' })
  listPrograms() {
    return this.service.adminListPrograms();
  }

  @Post('programs')
  @Permissions(Permission.SCHOLARSHIP_MANAGE)
  @ApiOperation({ summary: 'Create a scholarship program' })
  createProgram(@Body() dto: CreateScholarshipProgramDto) {
    return this.service.adminCreateProgram(dto);
  }

  @Patch('programs/:id')
  @Permissions(Permission.SCHOLARSHIP_MANAGE)
  @ApiOperation({ summary: 'Update a scholarship program (title, deadline, amount, open/closed…)' })
  updateProgram(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScholarshipProgramDto) {
    return this.service.adminUpdateProgram(id, dto);
  }

  /**
   * Publish and close are distinct actions rather than a `status` field on
   * PATCH. Publishing is the moment a scholarship becomes real to applicants, so
   * it is the one place worth refusing an incomplete record; a status writable
   * through a general update invites a half-composed offer going live.
   *
   * Declared BEFORE `programs/:id` is irrelevant here (these are POSTs to a
   * longer path), but keep them adjacent to the CRUD they belong to.
   */
  @Post('programs/:id/publish')
  @Permissions(Permission.SCHOLARSHIP_MANAGE)
  @ApiOperation({ summary: 'Make a scholarship public (validates it is complete)' })
  publishProgram(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminPublishProgram(id);
  }

  @Post('programs/:id/close')
  @Permissions(Permission.SCHOLARSHIP_MANAGE)
  @ApiOperation({ summary: 'Stop accepting applications; submitted ones continue through review' })
  closeProgram(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminCloseProgram(id);
  }

  @Delete('programs/:id')
  @Permissions(Permission.SCHOLARSHIP_MANAGE)
  @ApiOperation({
    summary: 'Delete (soft) a scholarship program — refused once it has applications',
  })
  deleteProgram(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminDeleteProgram(id);
  }

  // ── Applications ─────────────────────────────────────────────────────────

  @Get('applications')
  @Permissions(Permission.SCHOLARSHIP_VIEW)
  @ApiOperation({ summary: 'List all scholarship applications' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('programId') programId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminList({
      status,
      programId,
      search,
      dateFrom,
      dateTo,
      // `parseInt` alone returns NaN for junk, and NaN reaches TypeORM as the
      // skip/take — `?limit=0` divided through to `pages: Infinity`, and a
      // negative page asked Postgres for a negative OFFSET. Clamped here rather
      // than trusted, since these are query strings.
      page: positiveInt(page, 1),
      limit: Math.min(positiveInt(limit, 20), 200),
    });
  }

  @Get('applications/:id')
  @Permissions(Permission.SCHOLARSHIP_VIEW)
  @ApiOperation({ summary: 'Get full application detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGetById(id);
  }

  @Patch('applications/:id/status')
  @Permissions(Permission.SCHOLARSHIP_APPROVE)
  @ApiOperation({ summary: 'Start review / approve / reject / confirm' })
  updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScholarshipStatusDto,
  ) {
    return this.service.adminUpdateStatus(id, user.id, dto);
  }

  @Patch('applications/:id/documents/:docId/verify')
  @Permissions(Permission.SCHOLARSHIP_MANAGE)
  @ApiOperation({ summary: 'Mark a submitted document as verified / unverified' })
  verifyDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() body: VerifyScholarshipDocumentDto,
  ) {
    return this.service.adminVerifyDocument(id, docId, user.id, body.verified);
  }

  @Get('reports')
  @Permissions(Permission.SCHOLARSHIP_REPORTS)
  @ApiOperation({ summary: 'Application statistics, optionally for one scholarship' })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getReports(
    @Query('programId') programId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.adminGetReports({ programId, dateFrom, dateTo });
  }

  @Get('reports/export')
  @Permissions(Permission.SCHOLARSHIP_REPORTS)
  @ApiOperation({ summary: 'Export scholarship applications as CSV' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async exportCsv(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('programId') programId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const csv = await this.service.adminExportCsv({ status, programId, search, dateFrom, dateTo });
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="scholarship-applications.csv"',
    });
    res.status(200).send(csv);
  }
}
