import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Province } from './entities/province.entity';
import { District } from './entities/district.entity';
import { Sector } from './entities/sector.entity';
import { Area } from './entities/area.entity';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Province, District, Sector, Area])],
  providers: [LocationsService],
  controllers: [LocationsController],
  exports: [LocationsService, TypeOrmModule],
})
export class LocationsModule {}
