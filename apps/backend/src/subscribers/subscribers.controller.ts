import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto, UnsubscribeDto } from './dto/subscriber.dto';

@ApiTags('Subscribers')
@Controller('public')
export class SubscribersController {
  constructor(private readonly service: SubscribersService) {}

  @Public()
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe an email to platform updates (single opt-in)' })
  subscribe(@Body() dto: CreateSubscriberDto) {
    return this.service.subscribe(dto);
  }

  @Public()
  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe via the token from an email link' })
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.service.unsubscribe(dto.token);
  }
}
