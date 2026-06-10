import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mosque } from './entities/mosque.entity';
import { MosqueImam } from './entities/mosque-imam.entity';
import { MosquesService } from './mosques.service';
import { MosquesController } from './mosques.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Mosque, MosqueImam])],
  providers: [MosquesService],
  controllers: [MosquesController],
  exports: [MosquesService, TypeOrmModule],
})
export class MosquesModule {}
