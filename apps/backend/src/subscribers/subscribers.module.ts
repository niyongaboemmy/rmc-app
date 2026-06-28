import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscriber } from './entities/subscriber.entity';
import { SubscribersService } from './subscribers.service';
import { SubscribersController } from './subscribers.controller';
import { SubscribersAdminController } from './subscribers-admin.controller';
import { EmailModule } from '../integrations/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subscriber]), EmailModule],
  controllers: [SubscribersController, SubscribersAdminController],
  providers: [SubscribersService],
  exports: [SubscribersService],
})
export class SubscribersModule {}
