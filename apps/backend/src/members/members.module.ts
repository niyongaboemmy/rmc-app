import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberProfile } from './entities/member-profile.entity';
import { User } from '../users/entities/user.entity';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MemberProfile, User])],
  providers: [MembersService],
  controllers: [MembersController],
  exports: [MembersService],
})
export class MembersModule {}
