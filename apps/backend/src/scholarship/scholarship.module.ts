import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScholarshipApplication } from './entities/scholarship-application.entity';
import { ScholarshipStatusHistory } from './entities/scholarship-status-history.entity';
import { ScholarshipProgram } from './entities/scholarship-program.entity';
import { ScholarshipService } from './scholarship.service';
import { ScholarshipController } from './scholarship.controller';
import { ScholarshipAdminController } from './scholarship-admin.controller';
import { User } from '../users/entities/user.entity';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [
    LocationsModule,
    TypeOrmModule.forFeature([
      ScholarshipApplication,
      ScholarshipStatusHistory,
      ScholarshipProgram,
      User,
    ]),
  ],
  providers: [ScholarshipService],
  controllers: [ScholarshipController, ScholarshipAdminController],
  exports: [ScholarshipService],
})
export class ScholarshipModule {}
