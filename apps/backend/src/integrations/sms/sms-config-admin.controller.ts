import { Body, Controller, Get, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/types/permissions.enum';
import { SmsConfigService } from './sms-config.service';
import { SmsService } from './sms.service';
import { UpdateSmsConfigDto } from './dto/update-sms-config.dto';
import { TestSmsDto } from './dto/test-sms.dto';

@ApiTags('System — SMS Config')
@Controller('admin/system/sms-config')
@ApiBearerAuth()
export class SmsConfigAdminController {
  constructor(
    private readonly smsConfig: SmsConfigService,
    private readonly sms: SmsService,
  ) {}

  @Get()
  @Permissions(Permission.SMS_CONFIG_VIEW)
  @ApiOperation({ summary: 'Get current SMS gateway configuration' })
  getConfig() {
    return this.smsConfig.getForAdmin();
  }

  @Patch()
  @Permissions(Permission.SMS_CONFIG_MANAGE)
  @ApiOperation({ summary: 'Update SMS gateway credentials and settings' })
  async updateConfig(@Body() dto: UpdateSmsConfigDto) {
    await this.smsConfig.update(dto);
    return { message: 'SMS configuration updated successfully.' };
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.SMS_CONFIG_MANAGE)
  @ApiOperation({ summary: 'Enable SMS sending' })
  async activate() {
    await this.smsConfig.setActive(true);
    return { message: 'SMS gateway activated.' };
  }

  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.SMS_CONFIG_MANAGE)
  @ApiOperation({ summary: 'Disable SMS sending (falls back to console log)' })
  async deactivate() {
    await this.smsConfig.setActive(false);
    return { message: 'SMS gateway deactivated.' };
  }

  @Post('refresh-cache')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.SMS_CONFIG_MANAGE)
  @ApiOperation({ summary: 'Force-reload SMS config from database into memory cache' })
  async refreshCache() {
    await this.smsConfig.refreshCache();
    return { message: 'SMS config cache refreshed.' };
  }

  @Get('history')
  @Permissions(Permission.SMS_CONFIG_VIEW)
  @ApiOperation({ summary: 'Paginated list of sent SMS messages' })
  getHistory(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.smsConfig.getHistory(Number(page), Number(limit));
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.SMS_CONFIG_MANAGE)
  @ApiOperation({ summary: 'Send a test SMS to verify the gateway is working' })
  async testSms(@Body() dto: TestSmsDto) {
    const result = await this.sms.send({
      to: dto.phone,
      message: dto.message,
    });

    return {
      success: result.success,
      provider: result.provider,
      recipients: result.recipients,
      details: result.details,
      summary: result.summary ?? null,
      error: result.error ?? null,
    };
  }
}
