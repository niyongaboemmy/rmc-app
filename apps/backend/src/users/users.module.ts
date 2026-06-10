import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
