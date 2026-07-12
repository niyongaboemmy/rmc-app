import { Module } from '@nestjs/common';
import { PublicUploadModule } from '../integrations/storage/public-upload.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuneralRequest } from './entities/funeral-request.entity';
import { FuneralStatusHistory } from './entities/funeral-status-history.entity';
import { Cemetery } from './entities/cemetery.entity';
import { FuneralStep } from './entities/funeral-step.entity';
import { FuneralTransport } from './entities/funeral-transport.entity';
import { Mosque } from '../mosques/entities/mosque.entity';
import { FuneralService } from './funeral.service';
import { CemeteryService } from './cemetery.service';
import { FuneralStepService } from './funeral-step.service';
import { FuneralTransportService } from './funeral-transport.service';
import { FuneralController } from './funeral.controller';
import { FuneralAdminController } from './funeral-admin.controller';

@Module({
  imports: [
    PublicUploadModule,
    TypeOrmModule.forFeature([FuneralRequest, FuneralStatusHistory, Cemetery, FuneralStep, FuneralTransport, Mosque]),
  ],
  providers: [FuneralService, CemeteryService, FuneralStepService, FuneralTransportService],
  controllers: [FuneralController, FuneralAdminController],
  exports: [FuneralService, CemeteryService, FuneralStepService, FuneralTransportService],
})
export class FuneralModule {}
