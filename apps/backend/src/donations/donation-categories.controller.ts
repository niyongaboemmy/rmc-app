import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { DonationCategoriesService } from './donation-categories.service';

@ApiTags('Donations')
@Controller('donations/categories')
export class DonationCategoriesController {
  constructor(private readonly service: DonationCategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Donation categories + sub-funds for the public donate page (localized)',
  })
  @ApiQuery({ name: 'locale', required: false, enum: ['en', 'rw', 'ar'] })
  list(@Query('locale') locale?: string) {
    return this.service.listPublic(locale ?? 'en');
  }
}
