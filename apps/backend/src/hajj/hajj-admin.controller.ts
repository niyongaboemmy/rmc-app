import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseUUIDPipe, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsBoolean } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HajjService } from './hajj.service';
import { HajjRequirementService } from './hajj-requirement.service';
import { HajjBankAccountService } from './hajj-bank-account.service';
import { UpdateHajjStatusDto } from './dto/update-hajj-status.dto';
import { QueryHajjApplicationsDto } from './dto/query-hajj-applications.dto';
import { CreateHajjRequirementDto } from './dto/create-hajj-requirement.dto';
import { UpdateHajjRequirementDto } from './dto/update-hajj-requirement.dto';
import { ReorderHajjRequirementsDto } from './dto/reorder-hajj-requirements.dto';
import { CreateHajjBankAccountDto } from './dto/create-hajj-bank-account.dto';
import { UpdateHajjBankAccountDto } from './dto/update-hajj-bank-account.dto';
import { ReorderHajjBankAccountsDto } from './dto/reorder-hajj-bank-accounts.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { sendXlsx } from '../common/utils/xlsx';
import { User } from '../users/entities/user.entity';

class VerifyHajjDocumentDto {
  @IsBoolean()
  verified: boolean;
}

/**
 * Guards are global APP_GUARDs (Jwt + Roles + Permissions) — @Permissions() alone
 * gates each route, matching the marriage admin controller.
 */
@ApiTags('Hajj — Admin')
@Controller('admin/hajj')
@ApiBearerAuth()
export class HajjAdminController {
  constructor(
    private readonly service: HajjService,
    private readonly requirements: HajjRequirementService,
    private readonly bankAccounts: HajjBankAccountService,
  ) {}

  // ── Requirements CMS ──────────────────────────────────────────────────────
  // Content editing is gated on HAJJ_MANAGE; viewing follows the list permission.

  @Get('requirements')
  @Permissions(Permission.HAJJ_VIEW)
  @ApiOperation({ summary: 'List Hajj requirements (including inactive)' })
  listRequirements() {
    return this.requirements.findAllDto(false);
  }

  @Post('requirements')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Add a Hajj requirement' })
  createRequirement(@Body() dto: CreateHajjRequirementDto) {
    return this.requirements.create(dto);
  }

  /** Declared before `requirements/:id` so the literal path wins the route match. */
  @Patch('requirements/reorder')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Reorder Hajj requirements' })
  reorderRequirements(@Body() dto: ReorderHajjRequirementsDto) {
    return this.requirements.reorder(dto.ids);
  }

  @Patch('requirements/:id')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Update a Hajj requirement' })
  updateRequirement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHajjRequirementDto,
  ) {
    return this.requirements.update(id, dto);
  }

  @Delete('requirements/:id')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Delete a Hajj requirement' })
  removeRequirement(@Param('id', ParseUUIDPipe) id: string) {
    return this.requirements.remove(id);
  }

  // ── Bank accounts CMS ─────────────────────────────────────────────────────
  // The accounts applicants pay the Hajj fees into. Same gating as above.

  @Get('bank-accounts')
  @Permissions(Permission.HAJJ_VIEW)
  @ApiOperation({ summary: 'List Hajj bank accounts (including inactive)' })
  listBankAccounts() {
    return this.bankAccounts.findAllDto(false);
  }

  @Post('bank-accounts')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Add a Hajj bank account' })
  createBankAccount(@Body() dto: CreateHajjBankAccountDto) {
    return this.bankAccounts.create(dto);
  }

  /** Declared before `bank-accounts/:id` so the literal path wins the route match. */
  @Patch('bank-accounts/reorder')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Reorder Hajj bank accounts' })
  reorderBankAccounts(@Body() dto: ReorderHajjBankAccountsDto) {
    return this.bankAccounts.reorder(dto.ids);
  }

  @Patch('bank-accounts/:id')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Update a Hajj bank account' })
  updateBankAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHajjBankAccountDto,
  ) {
    return this.bankAccounts.update(id, dto);
  }

  @Delete('bank-accounts/:id')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Delete a Hajj bank account' })
  removeBankAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.bankAccounts.remove(id);
  }

  @Get('applications')
  @Permissions(Permission.HAJJ_VIEW)
  @ApiOperation({ summary: 'List Hajj applications' })
  findAll(@Query() query: QueryHajjApplicationsDto) {
    return this.service.adminFindAll(query);
  }

  @Get('stats')
  @Permissions(Permission.HAJJ_VIEW)
  @ApiOperation({ summary: 'Application counts by status' })
  stats() {
    return this.service.adminStats();
  }

  /**
   * Declared before `applications/:id` on purpose: Nest matches in declaration
   * order, so the other way round "export" would be parsed as an id and rejected
   * by the UUID pipe. Ignores page/limit — a report covers the whole filtered set.
   */
  @Get('applications/export')
  @Permissions(Permission.HAJJ_VIEW)
  @ApiOperation({ summary: 'Export the filtered applications as an .xlsx report' })
  async exportApplications(
    @Query() query: QueryHajjApplicationsDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.service.adminExportXlsx({
      status: query.status,
      search: query.search,
    });
    sendXlsx(res, buffer, 'hajj-applications');
  }

  @Get('applications/:id')
  @Permissions(Permission.HAJJ_VIEW)
  @ApiOperation({ summary: 'Get one Hajj application' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminFindOne(id);
  }

  @Get('applications/:id/history')
  @Permissions(Permission.HAJJ_VIEW)
  @ApiOperation({ summary: 'Status history (audit trail) for an application' })
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGetHistory(id);
  }

  /**
   * Stream a receipt to the admin. The file server will not serve these keys to an
   * anonymous browser, so this authenticated route is the only way to see them.
   */
  @Get('documents/:docId/file')
  @Permissions(Permission.HAJJ_VIEW)
  @ApiOperation({ summary: 'Download/inspect an uploaded receipt' })
  async documentFile(
    @Param('docId', ParseUUIDPipe) docId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { document, buffer, mimeType } = await this.service.adminGetDocumentFile(docId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    // inline so images render in <img> and PDFs in an <iframe>
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.fileName.replace(/"/g, '')}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(buffer);
  }

  @Patch('documents/:docId/verify')
  @Permissions(Permission.HAJJ_MANAGE)
  @ApiOperation({ summary: 'Mark an uploaded receipt as verified (or un-verify it)' })
  verifyDocument(
    @CurrentUser() user: User,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() body: VerifyHajjDocumentDto,
  ) {
    return this.service.adminVerifyDocument(docId, user.id, body.verified);
  }

  @Patch('applications/:id/status')
  @Permissions(Permission.HAJJ_APPROVE)
  @ApiOperation({ summary: 'Verify, approve or reject an application' })
  updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHajjStatusDto,
  ) {
    return this.service.adminUpdateStatus(id, user.id, dto);
  }
}
