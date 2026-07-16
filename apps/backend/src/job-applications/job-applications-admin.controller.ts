import { Controller, Get, Patch, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JobApplicationsService } from './job-applications.service';
import { UpdateJobApplicationStatusDto } from './dto/update-job-application-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Job Applications — Admin')
@Controller('admin/job-applications')
@ApiBearerAuth()
export class JobApplicationsAdminController {
  constructor(private readonly service: JobApplicationsService) {}

  @Get()
  @Permissions(Permission.JOB_APPLICATIONS_VIEW)
  @ApiOperation({ summary: 'List all job applications' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminList({
      status,
      search,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(':id')
  @Permissions(Permission.JOB_APPLICATIONS_VIEW)
  @ApiOperation({ summary: 'Get full job application detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGetById(id);
  }

  @Patch(':id/status')
  @Permissions(Permission.JOB_APPLICATIONS_MANAGE)
  @ApiOperation({ summary: 'Start review / shortlist / accept / reject / request more info' })
  updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobApplicationStatusDto,
  ) {
    return this.service.adminUpdateStatus(id, user.id, dto);
  }
}
