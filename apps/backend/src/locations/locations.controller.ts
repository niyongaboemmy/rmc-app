import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  @Public()
  @ApiOperation({ summary: 'Get all provinces' })
  findProvinces() {
    return this.locationsService.findAllProvinces();
  }

  @Get('districts')
  @Public()
  @ApiOperation({ summary: 'Get districts, optionally filtered by province' })
  @ApiQuery({ name: 'provinceId', required: false })
  findDistricts(@Query('provinceId') provinceId?: string) {
    return this.locationsService.findAllDistricts(provinceId);
  }

  @Get('sectors')
  @Public()
  @ApiOperation({ summary: 'Get sectors, optionally filtered by district' })
  @ApiQuery({ name: 'districtId', required: false })
  findSectors(@Query('districtId') districtId?: string) {
    return this.locationsService.findAllSectors(districtId);
  }

  @Get('areas')
  @Public()
  @ApiOperation({ summary: 'Get areas, optionally filtered by district' })
  @ApiQuery({ name: 'districtId', required: false })
  findAreas(@Query('districtId') districtId?: string) {
    return this.locationsService.findAllAreas(districtId);
  }
}
