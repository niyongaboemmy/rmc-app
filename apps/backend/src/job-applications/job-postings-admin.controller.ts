import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JobPostingsService } from './job-postings.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import { JobPostingStatus } from './entities/job-posting.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Job Postings — Admin')
@Controller('admin/job-postings')
@ApiBearerAuth()
export class JobPostingsAdminController {
  constructor(private readonly service: JobPostingsService) {}

  @Get()
  @Permissions(Permission.JOB_APPLICATIONS_VIEW)
  @ApiOperation({ summary: 'List all job postings (any status)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  list(@Query('status') status?: string, @Query('search') search?: string) {
    return this.service.adminList({ status, search });
  }

  @Get(':id')
  @Permissions(Permission.JOB_APPLICATIONS_VIEW)
  @ApiOperation({ summary: 'Get a job posting' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminGet(id);
  }

  @Post()
  @Permissions(Permission.JOB_APPLICATIONS_MANAGE)
  @ApiOperation({ summary: 'Create a job posting' })
  create(@CurrentUser() user: User, @Body() dto: CreateJobPostingDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @Permissions(Permission.JOB_APPLICATIONS_MANAGE)
  @ApiOperation({ summary: 'Update a job posting' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateJobPostingDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/publish')
  @Permissions(Permission.JOB_APPLICATIONS_MANAGE)
  @ApiOperation({ summary: 'Publish (open) a job posting' })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.setStatus(id, JobPostingStatus.OPEN);
  }

  @Post(':id/close')
  @Permissions(Permission.JOB_APPLICATIONS_MANAGE)
  @ApiOperation({ summary: 'Close a job posting' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.setStatus(id, JobPostingStatus.CLOSED);
  }

  @Delete(':id')
  @Permissions(Permission.JOB_APPLICATIONS_MANAGE)
  @ApiOperation({ summary: 'Delete a job posting (only if it has no applications)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
