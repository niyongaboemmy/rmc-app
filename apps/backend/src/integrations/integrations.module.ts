import { Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { MoMoModule } from './momo/momo.module';
import { CalendarModule } from './calendar/calendar.module';
import { NotificationSettingsModule } from './notifications/notification-settings.module';

@Module({
  imports: [EmailModule, SmsModule, MoMoModule, CalendarModule, NotificationSettingsModule],
  exports: [EmailModule, SmsModule, MoMoModule, CalendarModule, NotificationSettingsModule],
})
export class IntegrationsModule {}
