import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSetting } from './entities/notification-setting.entity';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSettingsAdminController } from './notification-settings-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationSetting])],
  providers: [NotificationSettingsService],
  controllers: [NotificationSettingsAdminController],
  exports: [NotificationSettingsService],
})
export class NotificationSettingsModule {}
