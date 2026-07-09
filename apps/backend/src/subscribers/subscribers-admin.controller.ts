import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { SubscribersService } from './subscribers.service';
import { BroadcastDto, TestEmailDto } from './dto/subscriber.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';

/** Minimal shape of an in-memory multer upload (avoids an @types/multer import). */
interface UploadedExcel {
  buffer: Buffer;
  originalname: string;
  size: number;
}

@ApiTags('Subscribers — Admin')
@ApiBearerAuth()
@Controller('admin/subscribers')
export class SubscribersAdminController {
  constructor(private readonly service: SubscribersService) {}

  @Get()
  @Permissions(Permission.SUBSCRIBERS_VIEW)
  @ApiOperation({ summary: 'List subscribers with totals' })
  list() {
    return this.service.adminList();
  }

  @Post('broadcast')
  @Permissions(Permission.SUBSCRIBERS_MANAGE)
  @ApiOperation({ summary: 'Send a broadcast/newsletter to all active subscribers' })
  broadcast(@Body() dto: BroadcastDto) {
    return this.service.broadcast(dto);
  }

  @Post('broadcast-file')
  @Permissions(Permission.SUBSCRIBERS_MANAGE)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk-mail a message to emails uploaded in an Excel/CSV file' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  broadcastFile(
    @UploadedFile() file: UploadedExcel | undefined,
    @Body() body: { subject?: string; html?: string },
  ) {
    if (!file?.buffer) throw new BadRequestException('An Excel/CSV file is required.');
    const subject = (body.subject ?? '').trim();
    const html = body.html ?? '';
    if (subject.length < 2) throw new BadRequestException('A subject is required.');
    if (html.replace(/<[^>]*>/g, '').trim().length === 0) {
      throw new BadRequestException('A message body is required.');
    }
    return this.service.broadcastFromFile(subject, html, file.buffer);
  }

  @Post('test-email')
  @Permissions(Permission.SUBSCRIBERS_MANAGE)
  @ApiOperation({ summary: 'Send a one-off test email to verify SMTP delivery' })
  sendTest(@Body() dto: TestEmailDto) {
    return this.service.sendTest(dto.to);
  }

  @Delete(':id')
  @Permissions(Permission.SUBSCRIBERS_MANAGE)
  @ApiOperation({ summary: 'Remove a subscriber' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.adminRemove(id);
  }
}
