import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
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

  // ── History Entries ──────────────────────────────────────────────────────────

  @Get('history/entries')
  @Public()
  @ApiOperation({ summary: 'Get all RMC history timeline entries' })
  getHistory() {
    return this.service.getHistoryEntries();
  }

  @Post('history/entries')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Create a history entry (admin)' })
  createHistory(@Body() dto: any) {
    return this.service.createHistoryEntry(dto);
  }

  @Put('history/entries/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Update a history entry (admin)' })
  updateHistory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.updateHistoryEntry(id, dto);
  }

  @Delete('history/entries/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a history entry (admin)' })
  deleteHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteHistoryEntry(id);
  }
}
