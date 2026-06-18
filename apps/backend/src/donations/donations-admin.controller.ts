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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { UpdateDonationDto } from './dto/update-donation.dto';
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
  findAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminFindAll({
      dateFrom,
      dateTo,
      campaignId,
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
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

  @Patch(':id')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Edit an individual donation record' })
  updateDonation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDonationDto) {
    return this.service.adminUpdateDonation(id, dto);
  }

  // ── Programs / campaigns ────────────────────────────────────────────────────

  @Get('campaigns')
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'List donation programs with live received totals' })
  listCampaigns() {
    return this.service.adminListCampaigns();
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
}
