import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ContactMessagesService } from './contact-messages.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@ApiTags('Contact Messages')
@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly service: ContactMessagesService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a message from the public Contact page' })
  create(@Body() dto: CreateContactMessageDto) {
    return this.service.create(dto);
  }
}
