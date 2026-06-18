import {
  Controller,
  Get,
  Put,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContentService } from './content.service';
import { UpdateContentDto } from './dto/update-content.dto';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly service: ContentService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all editable site content sections' })
  getAll() {
    return this.service.getAll();
  }

  @Get(':key')
  @Public()
  @ApiOperation({ summary: 'Get a single content section by key' })
  getByKey(@Param('key') key: string) {
    return this.service.getByKey(key);
  }

  @Put(':key')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Create or update a content section' })
  upsert(
    @Param('key') key: string,
    @Body() dto: UpdateContentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.upsert(key, dto.value, userId ?? null);
  }
}
