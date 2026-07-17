import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JobApplication } from './entities/job-application.entity';
import { JobApplicationStatusHistory } from './entities/job-application-status-history.entity';
import { JobPosting } from './entities/job-posting.entity';
import { TrackingVerification } from './entities/tracking-verification.entity';
import { JobApplicationsService } from './job-applications.service';
import { JobPostingsService } from './job-postings.service';
import { TrackingVerificationService } from './tracking-verification.service';
import { JobApplicationsController } from './job-applications.controller';
import { JobApplicationsAdminController } from './job-applications-admin.controller';
import { JobPostingsController } from './job-postings.controller';
import { JobPostingsAdminController } from './job-postings-admin.controller';
import { NotificationSettingsModule } from '../integrations/notifications/notification-settings.module';
import { SmsModule } from '../integrations/sms/sms.module';
import { EmailModule } from '../integrations/email/email.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    NotificationSettingsModule,
    SmsModule,
    EmailModule,
    RedisModule,
    // Dedicated short-lived token for the tracking session (own secret, falls
    // back to the access secret). Resolved at init so env vars are loaded.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('TRACKING_TOKEN_SECRET') || config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([JobApplication, JobApplicationStatusHistory, JobPosting, TrackingVerification]),
  ],
  providers: [JobApplicationsService, JobPostingsService, TrackingVerificationService],
  controllers: [
    JobApplicationsController,
    JobApplicationsAdminController,
    JobPostingsController,
    JobPostingsAdminController,
  ],
  exports: [JobApplicationsService, JobPostingsService],
})
export class JobApplicationsModule {}
