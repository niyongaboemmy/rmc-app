import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from './entities/school.entity';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { SchoolsAdminController } from './schools-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([School])],
  providers: [SchoolsService],
  controllers: [SchoolsController, SchoolsAdminController],
  exports: [SchoolsService],
})
export class SchoolsModule {}
