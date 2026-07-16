import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from './entities/job-application.entity';
import { JobApplicationStatusHistory } from './entities/job-application-status-history.entity';
import { JobPosting } from './entities/job-posting.entity';
import { JobApplicationsService } from './job-applications.service';
import { JobPostingsService } from './job-postings.service';
import { JobApplicationsController } from './job-applications.controller';
import { JobApplicationsAdminController } from './job-applications-admin.controller';
import { JobPostingsController } from './job-postings.controller';
import { JobPostingsAdminController } from './job-postings-admin.controller';
import { NotificationSettingsModule } from '../integrations/notifications/notification-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';
import { EmailModule } from '../integrations/email/email.module';

@Module({
  imports: [
    NotificationSettingsModule,
    SmsModule,
    EmailModule,
    TypeOrmModule.forFeature([JobApplication, JobApplicationStatusHistory, JobPosting]),
  ],
  providers: [JobApplicationsService, JobPostingsService],
  controllers: [
    JobApplicationsController,
    JobApplicationsAdminController,
    JobPostingsController,
    JobPostingsAdminController,
  ],
  exports: [JobApplicationsService, JobPostingsService],
})
export class JobApplicationsModule {}
