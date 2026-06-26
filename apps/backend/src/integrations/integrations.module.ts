import { Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { CalendarModule } from './calendar/calendar.module';
import { NotificationSettingsModule } from './notifications/notification-settings.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [EmailModule, SmsModule, CalendarModule, NotificationSettingsModule, AiModule],
  exports: [EmailModule, SmsModule, CalendarModule, NotificationSettingsModule, AiModule],
})
export class IntegrationsModule {}
