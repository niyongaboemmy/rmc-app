import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSettings } from './entities/ai-settings.entity';
import { Mosque } from '../../mosques/entities/mosque.entity';
import { AiSettingsService } from './ai-settings.service';
import { AiChatService } from './ai-chat.service';
import { AiContextService } from './ai-context.service';
import { AiSettingsAdminController } from './ai-settings-admin.controller';
import { AiChatController } from './ai-chat.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiSettings, Mosque])],
  providers: [AiSettingsService, AiChatService, AiContextService],
  controllers: [AiSettingsAdminController, AiChatController],
  exports: [AiSettingsService],
})
export class AiModule {}
