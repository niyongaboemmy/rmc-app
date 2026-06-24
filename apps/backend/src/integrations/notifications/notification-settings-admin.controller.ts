import { Body, Controller, Get, Patch, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/types/permissions.enum';
import { NotificationSettingsService } from './notification-settings.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@ApiTags('System — Notification Settings')
@Controller('admin/system/notification-settings')
@ApiBearerAuth()
export class NotificationSettingsAdminController {
  constructor(private readonly service: NotificationSettingsService) {}

  @Get()
  @Permissions(Permission.NOTIFICATION_SETTINGS_VIEW)
  @ApiOperation({ summary: 'List all notification events and their channel preferences' })
  getAll() {
    return this.service.getAll();
  }

  @Patch()
  @Permissions(Permission.NOTIFICATION_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Bulk-update notification channel preferences' })
  async updateMany(@Body() dto: UpdateNotificationSettingsDto) {
    await this.service.updateMany(dto.updates);
    return { message: 'Notification settings updated successfully.' };
  }

  @Post('refresh-cache')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.NOTIFICATION_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Force-reload notification settings into memory cache' })
  async refreshCache() {
    await this.service.refreshCache();
    return { message: 'Notification settings cache refreshed.' };
  }
}
