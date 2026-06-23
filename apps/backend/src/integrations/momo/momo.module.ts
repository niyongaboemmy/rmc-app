import { Module } from '@nestjs/common';
import { MoMoService } from './momo.service';

@Module({
  providers: [MoMoService],
  exports: [MoMoService],
})
export class MoMoModule {}
