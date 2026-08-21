import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JobPostingsService } from './job-postings.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Job Postings — Public')
@Controller('job-postings')
export class JobPostingsController {
  constructor(private readonly service: JobPostingsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List open job vacancies (public)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'employmentType', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  list(
    @Query('search') search?: string,
    @Query('employmentType') employmentType?: string,
    @Query('districtId') districtId?: string,
  ) {
    return this.service.listOpen({ search, employmentType, districtId });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single job vacancy (public)' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPublic(id);
  }
}
