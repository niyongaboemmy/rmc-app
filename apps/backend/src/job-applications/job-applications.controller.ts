import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobApplicationsService } from './job-applications.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { RespondMoreInfoDto } from './dto/respond-more-info.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Job Applications — Member')
@ApiBearerAuth()
@Controller('job-applications')
export class JobApplicationsController {
  constructor(private readonly service: JobApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a job application' })
  create(@CurrentUser() user: User, @Body() dto: CreateJobApplicationDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List own job applications' })
  listOwn(@CurrentUser() user: User, @Query('status') status?: string) {
    return this.service.listOwn(user.id, { status });
  }

  @Get('track/:trackingNumber')
  @Public()
  @ApiOperation({ summary: 'Public status lookup by tracking number (no auth)' })
  track(@Param('trackingNumber') trackingNumber: string) {
    return this.service.trackByNumber(trackingNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get own job application details' })
  findOwn(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwn(id, user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a submitted or under-review application' })
  cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id, user.id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Reply to a reviewer\'s request for more information' })
  respond(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondMoreInfoDto,
  ) {
    return this.service.respondToMoreInfo(id, user.id, dto);
  }
}
