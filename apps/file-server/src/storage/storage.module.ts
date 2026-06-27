import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { UploadSettingsService } from './upload-settings.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, UploadSettingsService],
  exports: [StorageService, UploadSettingsService],
})
export class StorageModule {}
