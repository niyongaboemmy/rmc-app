import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { ContactMessagesService } from './contact-messages.service';
import { ContactMessagesController } from './contact-messages.controller';
import { ContactMessagesAdminController } from './contact-messages-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContactMessage])],
  providers: [ContactMessagesService],
  controllers: [ContactMessagesController, ContactMessagesAdminController],
  exports: [ContactMessagesService],
})
export class ContactMessagesModule {}
