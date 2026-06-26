import { Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { CalendarModule } from './calendar/calendar.module';
import { NotificationSettingsModule } from './notifications/notification-settings.module';

@Module({
  imports: [EmailModule, SmsModule, CalendarModule, NotificationSettingsModule],
  exports: [EmailModule, SmsModule, CalendarModule, NotificationSettingsModule],
})
export class IntegrationsModule {}
