import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadSettings } from './entities/upload-settings.entity';
import { UploadSettingsService } from './upload-settings.service';
import { UploadSettingsController } from './upload-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UploadSettings])],
  providers: [UploadSettingsService],
  controllers: [UploadSettingsController],
  exports: [UploadSettingsService],
})
export class UploadSettingsModule {}
