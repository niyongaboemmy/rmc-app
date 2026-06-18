import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { SocialService } from './social.service';

@ApiTags('Social')
@Controller('social')
export class SocialController {
  constructor(private readonly service: SocialService) {}

  @Get('feed')
  @Public()
  @ApiOperation({ summary: 'Latest aggregated social-media posts (cached)' })
  getFeed() {
    return this.service.getFeed();
  }

  @Post('refresh')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Force an immediate refresh of the social feed' })
  refresh() {
    return this.service.refresh();
  }
}
