import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from './entities/job-application.entity';
import { JobApplicationStatusHistory } from './entities/job-application-status-history.entity';
import { JobApplicationsService } from './job-applications.service';
import { JobApplicationsController } from './job-applications.controller';
import { JobApplicationsAdminController } from './job-applications-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JobApplication, JobApplicationStatusHistory])],
  providers: [JobApplicationsService],
  controllers: [JobApplicationsController, JobApplicationsAdminController],
  exports: [JobApplicationsService],
})
export class JobApplicationsModule {}
