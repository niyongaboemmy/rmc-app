import { Body, Controller, Get, Patch, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/types/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiSettingsService } from './ai-settings.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';

@ApiTags('System — AI Assistant')
@Controller('admin/system/ai-settings')
@ApiBearerAuth()
export class AiSettingsAdminController {
  constructor(private readonly aiSettings: AiSettingsService) {}

  @Get()
  @Permissions(Permission.AI_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Get the AI assistant configuration (keys masked)' })
  getConfig() {
    return this.aiSettings.getForAdmin();
  }

  @Patch()
  @Permissions(Permission.AI_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update AI provider keys, default provider, and models' })
  async updateConfig(@Body() dto: UpdateAiSettingsDto, @CurrentUser('id') userId: string) {
    await this.aiSettings.update(dto, userId ?? null);
    return { message: 'AI assistant settings updated successfully.' };
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.AI_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Enable the public AI assistant' })
  async activate() {
    await this.aiSettings.setActive(true);
    return { message: 'AI assistant enabled.' };
  }

  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.AI_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Disable the public AI assistant' })
  async deactivate() {
    await this.aiSettings.setActive(false);
    return { message: 'AI assistant disabled.' };
  }
}
