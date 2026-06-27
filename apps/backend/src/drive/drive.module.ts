import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriveItem, DriveShare } from './entities/drive-item.entity';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DriveItem, DriveShare, User])],
  providers: [DriveService],
  controllers: [DriveController],
  exports: [DriveService],
})
export class DriveModule {}
