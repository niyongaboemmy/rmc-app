import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TendersService } from './tenders.service';
import { CreateTenderApplicationDto } from './dto/create-tender-application.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Bidder-facing endpoints. Auth is implicit — JwtAuthGuard is registered
 * globally in app.module, so every route here requires a signed-in user, and
 * `user.id` scopes every lookup to the caller's own bids.
 *
 * The tenders themselves (the things being bid on) are served by the existing
 * public announcements endpoints (`GET /public/announcements?type=tender`) —
 * this controller only owns the applications.
 */
@ApiTags('Tenders — Applicant')
@Controller('tenders')
@ApiBearerAuth()
export class TendersController {
  constructor(private readonly service: TendersService) {}

  @Post('applications')
  @ApiOperation({ summary: 'Submit a bid for a tender' })
  create(@CurrentUser() user: User, @Body() dto: CreateTenderApplicationDto) {
    return this.service.create(user.id, dto);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List own tender applications' })
  listOwn(@CurrentUser() user: User) {
    return this.service.listOwn(user.id);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get own tender application detail' })
  findOwn(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwn(id, user.id);
  }

  @Patch('applications/:id')
  @ApiOperation({ summary: 'Update a submitted or more-info-requested bid' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTenderApplicationDto>,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Post('applications/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw a bid' })
  withdraw(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.withdraw(id, user.id);
  }
}
