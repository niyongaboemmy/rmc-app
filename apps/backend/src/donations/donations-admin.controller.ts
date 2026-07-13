import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { sendXlsx } from '../common/utils/xlsx';
// import { UpdateDonationDto } from './dto/update-donation.dto'; // donation editing disabled
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';

@ApiTags('Donations — Admin')
@Controller('admin/donations')
@ApiBearerAuth()
export class DonationsAdminController {
  constructor(private readonly service: DonationsService) {}

  // ── Report ────────────────────────────────────────────────────────────────

  @Get()
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'List donations (filter by date range, program, status, search)' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['date', 'amount', 'donor', 'status'] })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
  findAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
  ) {
    return this.service.adminFindAll({
      dateFrom,
      dateTo,
      campaignId,
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sort,
      order,
    });
  }

  /** Ignores page/limit — a report covers the whole filtered set, not one page. */
  @Get('export')
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'Export the filtered donations as an .xlsx report' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'niyyah', required: false })
  @ApiQuery({ name: 'method', required: false })
  async exportDonations(
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('niyyah') niyyah?: string,
    @Query('method') method?: string,
  ): Promise<void> {
    const buffer = await this.service.adminExportXlsx({
      dateFrom,
      dateTo,
      campaignId,
      status,
      search,
      category,
      niyyah,
      method,
    });
    sendXlsx(res, buffer, 'donations');
  }

  @Get('daily')
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'Daily completed-donation totals for the dashboard chart' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'currency', required: false })
  getDaily(@Query('days') days?: string, @Query('currency') currency?: string) {
    return this.service.adminGetDailyReceived(days ? parseInt(days, 10) : 30, currency || 'RWF');
  }

  @Get('stats')
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'Donation totals + per-program / per-currency breakdowns' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'status', required: false })
  getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.adminGetStats({ dateFrom, dateTo, campaignId, status });
  }

  // Editing individual donation records is disabled for now — restore this
  // route (and the UpdateDonationDto import) to re-enable.
  // @Patch(':id')
  // @Permissions(Permission.DONATIONS_MANAGE)
  // @ApiOperation({ summary: 'Edit an individual donation record' })
  // updateDonation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDonationDto) {
  //   return this.service.adminUpdateDonation(id, dto);
  // }

  // ── Programs / campaigns ────────────────────────────────────────────────────

  @Get('campaigns')
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'List donation programs with live received totals' })
  listCampaigns() {
    return this.service.adminListCampaigns();
  }

  @Get('campaigns/deleted')
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'List archived (soft-deleted) donation programs' })
  listDeletedCampaigns() {
    return this.service.adminListDeletedCampaigns();
  }

  @Post('campaigns')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Create a donation program' })
  createCampaign(@Body() dto: CreateCampaignDto, @CurrentUser('id') userId: string) {
    return this.service.createCampaign(dto, userId);
  }

  @Patch('campaigns/:id')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Update a donation program' })
  updateCampaign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto) {
    return this.service.updateCampaign(id, dto);
  }

  @Delete('campaigns/:id')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Archive (soft-delete) a donation program' })
  deleteCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteCampaign(id);
  }

  @Post('campaigns/:id/restore')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Restore an archived (soft-deleted) donation program' })
  restoreCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.restoreCampaign(id);
  }
}
