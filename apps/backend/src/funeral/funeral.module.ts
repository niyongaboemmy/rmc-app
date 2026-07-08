import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuneralRequest } from './entities/funeral-request.entity';
import { FuneralStatusHistory } from './entities/funeral-status-history.entity';
import { Cemetery } from './entities/cemetery.entity';
import { FuneralAnnouncement } from './entities/funeral-announcement.entity';
import { FuneralVolunteer } from './entities/funeral-volunteer.entity';
import { FuneralStep } from './entities/funeral-step.entity';
import { FuneralSkill } from './entities/funeral-skill.entity';
import { Mosque } from '../mosques/entities/mosque.entity';
import { FuneralService } from './funeral.service';
import { CemeteryService } from './cemetery.service';
import { AnnouncementService } from './announcement.service';
import { VolunteerService } from './volunteer.service';
import { FuneralStepService } from './funeral-step.service';
import { FuneralSkillService } from './funeral-skill.service';
import { FuneralController } from './funeral.controller';
import { FuneralAdminController } from './funeral-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FuneralRequest, FuneralStatusHistory, Cemetery, FuneralAnnouncement, FuneralVolunteer, FuneralStep, FuneralSkill, Mosque])],
  providers: [FuneralService, CemeteryService, AnnouncementService, VolunteerService, FuneralStepService, FuneralSkillService],
  controllers: [FuneralController, FuneralAdminController],
  exports: [FuneralService, CemeteryService, AnnouncementService, VolunteerService, FuneralStepService, FuneralSkillService],
})
export class FuneralModule {}
