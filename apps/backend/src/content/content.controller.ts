import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
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
  @Permissions(Permission.CONTENT_EDIT)
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
  @Permissions(Permission.CONTENT_CREATE)
  @ApiOperation({ summary: 'Create a history entry (admin)' })
  createHistory(@Body() dto: any) {
    return this.service.createHistoryEntry(dto);
  }

  @Put('history/entries/:id')
  @ApiBearerAuth()
  @Permissions(Permission.CONTENT_EDIT)
  @ApiOperation({ summary: 'Update a history entry (admin)' })
  updateHistory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.updateHistoryEntry(id, dto);
  }

  @Delete('history/entries/:id')
  @ApiBearerAuth()
  @Permissions(Permission.CONTENT_DELETE)
  @ApiOperation({ summary: 'Delete a history entry (admin)' })
  deleteHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteHistoryEntry(id);
  }
}
