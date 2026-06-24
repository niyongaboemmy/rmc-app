import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsConfig } from './entities/sms-config.entity';
import { SmsMessage } from './entities/sms-message.entity';
import { SmsConfigService } from './sms-config.service';
import { SmsService } from './sms.service';
import { SmsConfigAdminController } from './sms-config-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SmsConfig, SmsMessage])],
  providers: [SmsConfigService, SmsService],
  controllers: [SmsConfigAdminController],
  exports: [SmsService],
})
export class SmsModule {}
