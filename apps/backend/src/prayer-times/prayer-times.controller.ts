import { Controller, Get, Put, Body, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { PrayerTimesService } from './prayer-times.service';

class AdjustmentsDto {
  @IsOptional() @IsNumber() fajrAdj?: number;
  @IsOptional() @IsNumber() sunriseAdj?: number;
  @IsOptional() @IsNumber() dhuhrAdj?: number;
  @IsOptional() @IsNumber() asrAdj?: number;
  @IsOptional() @IsNumber() maghribAdj?: number;
  @IsOptional() @IsNumber() ishaAdj?: number;
}

@ApiTags('Prayer Times')
@Controller('prayer-times')
export class PrayerTimesController {
  constructor(private readonly service: PrayerTimesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get prayer times for coordinates or Kigali by default' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'mosqueId', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  async getPrayerTimes(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('mosqueId') mosqueId?: string,
    @Query('date') dateStr?: string,
  ) {
    const latitude = lat ? parseFloat(lat) : undefined;
    const longitude = lng ? parseFloat(lng) : undefined;
    const date = dateStr ? new Date(dateStr) : undefined;

    if (latitude !== undefined && longitude !== undefined) {
      return this.service.calculate(latitude, longitude, date, mosqueId);
    }
    return this.service.calculateForKigali(date);
  }

  @Get('weekly')
  @Public()
  @ApiOperation({ summary: 'Get weekly prayer schedule' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  getWeekly(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const latitude = lat ? parseFloat(lat) : -1.9403;
    const longitude = lng ? parseFloat(lng) : 29.8739;
    return this.service.generateWeeklySchedule(latitude, longitude);
  }

  @Get('mosque/:mosqueId/adjustments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get prayer time adjustments for a mosque' })
  getAdjustments(@Param('mosqueId', ParseUUIDPipe) mosqueId: string) {
    return this.service.getAdjustments(mosqueId);
  }

  @Put('mosque/:mosqueId/adjustments')
  @ApiBearerAuth()
  @Permissions(Permission.PRAYER_TIMES_MANAGE)
  @ApiOperation({ summary: 'Set prayer time minute adjustments for a mosque' })
  setAdjustments(@Param('mosqueId', ParseUUIDPipe) mosqueId: string, @Body() dto: AdjustmentsDto) {
    return this.service.setAdjustments(mosqueId, dto);
  }
}
