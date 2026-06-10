import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayerTimeAdjustment } from './entities/prayer-time-adjustment.entity';
import { PrayerTimesService } from './prayer-times.service';
import { PrayerTimesController } from './prayer-times.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PrayerTimeAdjustment])],
  providers: [PrayerTimesService],
  controllers: [PrayerTimesController],
  exports: [PrayerTimesService],
})
export class PrayerTimesModule {}
