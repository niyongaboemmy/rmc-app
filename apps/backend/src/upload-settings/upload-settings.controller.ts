import { Controller, Get, Patch, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UploadSettingsService } from './upload-settings.service';
import { UpdateUploadSettingsDto } from './dto/update-upload-settings.dto';
import { AddMimeTypeDto } from './dto/add-mime-type.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Upload Settings')
@Controller('upload-settings')
export class UploadSettingsController {
  constructor(private readonly service: UploadSettingsService) {}

  /** Public endpoint — file-server calls this to enforce limits. */
  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get current upload settings (public — used by file-server)' })
  getPublic() {
    return this.service.getSettings();
  }

  @Get()
  @ApiBearerAuth()
  @Permissions(Permission.UPLOAD_SETTINGS_VIEW)
  @ApiOperation({ summary: 'Get upload settings (admin)' })
  get() {
    return this.service.getSettings();
  }

  @Patch()
  @ApiBearerAuth()
  @Permissions(Permission.UPLOAD_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update max file size' })
  update(@Body() dto: UpdateUploadSettingsDto) {
    return this.service.updateSettings(dto);
  }

  @Post('mime-types')
  @ApiBearerAuth()
  @Permissions(Permission.UPLOAD_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Add an allowed MIME type' })
  addMimeType(@Body() dto: AddMimeTypeDto) {
    return this.service.addMimeType(dto.mimeType);
  }

  @Delete('mime-types/:mimeType')
  @ApiBearerAuth()
  @Permissions(Permission.UPLOAD_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Remove an allowed MIME type' })
  @ApiParam({
    name: 'mimeType',
    description: 'URL-encoded MIME type',
    example: 'application%2Fzip',
  })
  removeMimeType(@Param('mimeType') mimeType: string) {
    return this.service.removeMimeType(mimeType);
  }
}
