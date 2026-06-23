import { Controller, Get, Patch, Delete, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactMessagesService } from './contact-messages.service';
import { UpdateContactMessageDto } from './dto/update-contact-message.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';

@ApiTags('Contact Messages — Admin')
@Controller('admin/contact-messages')
@ApiBearerAuth()
export class ContactMessagesAdminController {
  constructor(private readonly service: ContactMessagesService) {}

  @Get()
  @Permissions(Permission.CONTACT_MESSAGES_VIEW)
  @ApiOperation({ summary: 'List contact messages (filter by status / search)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.adminFindAll({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('counts')
  @Permissions(Permission.CONTACT_MESSAGES_VIEW)
  @ApiOperation({ summary: 'Message counts per status (all / unread / read / archived)' })
  counts() {
    return this.service.adminCounts();
  }

  @Patch(':id')
  @Permissions(Permission.CONTACT_MESSAGES_MANAGE)
  @ApiOperation({ summary: 'Update a message status (read / archived / unread)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContactMessageDto) {
    return this.service.adminUpdate(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.CONTACT_MESSAGES_MANAGE)
  @ApiOperation({ summary: 'Delete a contact message' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminRemove(id);
  }
}
