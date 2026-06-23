import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';

@ApiTags('Donations')
@Controller('donations')
export class DonationsController {
  constructor(private readonly service: DonationsService) {}

  @Get('campaigns')
  @Public()
  @ApiOperation({ summary: 'List active donation programs for the public donate page' })
  listCampaigns() {
    return this.service.listPublicCampaigns();
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Record a donation made from the public donate page' })
  create(@Body() dto: CreateDonationDto, @CurrentUser('id') userId: string | undefined) {
    return this.service.create(dto, userId ?? null);
  }

  @Get(':id/status')
  @Public()
  @ApiOperation({
    summary:
      'Re-check a pending donation against the payment gateway and return its current status',
  })
  checkStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.refreshPaymentStatus(id);
  }
}
