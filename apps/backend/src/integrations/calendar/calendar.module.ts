import { Module } from '@nestjs/common';
import { HijriService } from './hijri.service';

@Module({
  providers: [HijriService],
  exports: [HijriService],
})
export class CalendarModule {}
