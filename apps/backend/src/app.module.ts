import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import socialConfig from './config/social.config';

import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AppController } from './app.controller';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { LocationsModule } from './locations/locations.module';
import { MosquesModule } from './mosques/mosques.module';
import { PrayerTimesModule } from './prayer-times/prayer-times.module';
import { MembersModule } from './members/members.module';
import { PublicModule } from './public/public.module';
import { MarriageModule } from './marriage/marriage.module';
import { GoodConductModule } from './good-conduct/good-conduct.module';
import { ContentModule } from './content/content.module';
import { DonationsModule } from './donations/donations.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { SchoolsModule } from './schools/schools.module';
import { SocialModule } from './social/social.module';
import { ContactMessagesModule } from './contact-messages/contact-messages.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PaymentSettingsModule } from './payment-settings/payment-settings.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DriveModule } from './drive/drive.module';
import { UploadSettingsModule } from './upload-settings/upload-settings.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, socialConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_config: ConfigService) => [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    DatabaseModule,
    RedisModule,
    UsersModule,
    RolesModule,
    AuthModule,
    LocationsModule,
    MosquesModule,
    PrayerTimesModule,
    MembersModule,
    PublicModule,
    MarriageModule,
    GoodConductModule,
    ContentModule,
    DonationsModule,
    SubscribersModule,
    SchoolsModule,
    SocialModule,
    ContactMessagesModule,
    IntegrationsModule,
    PaymentSettingsModule,
    WebhooksModule,
    DriveModule,
    UploadSettingsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
