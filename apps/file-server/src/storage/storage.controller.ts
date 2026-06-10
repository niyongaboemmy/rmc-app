import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Redirect,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { PresignedUploadDto } from './dto/presigned-upload.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles, Role } from '../common/decorators/roles.decorator';

@ApiTags('files')
@ApiBearerAuth()
@Controller()
export class StorageController {
  private readonly logger = new Logger(StorageController.name);
  private readonly allowedMimeTypes: string[];

  constructor(
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {
    this.allowedMimeTypes = this.config.get<string[]>('app.allowedMimeTypes') || [];
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file (server-side multipart)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'folder', required: false, example: 'avatars' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  @ApiResponse({ status: 400, description: 'No file / unsupported type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException({ code: 'NO_FILE', message: 'No file provided' });
    }
    if (this.allowedMimeTypes.length && !this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_MIME_TYPE',
        message: `MIME type "${file.mimetype}" is not allowed`,
        details: [`Allowed: ${this.allowedMimeTypes.join(', ')}`],
      });
    }

    const result = await this.storageService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder || 'uploads',
    );

    return {
      key: result.key,
      size: result.size,
      mimeType: result.mimeType,
      originalName: result.originalName,
    };
  }

  @Post('presigned-upload')
  @ApiOperation({ summary: 'Get a presigned S3 PUT URL for direct browser→S3 upload' })
  @ApiBody({ type: PresignedUploadDto })
  @ApiResponse({ status: 201, description: 'Presigned upload URL generated' })
  @ApiResponse({ status: 400, description: 'Unsupported MIME type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async presignedUpload(@Body() dto: PresignedUploadDto) {
    if (this.allowedMimeTypes.length && !this.allowedMimeTypes.includes(dto.mimeType)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_MIME_TYPE',
        message: `MIME type "${dto.mimeType}" is not allowed`,
        details: [`Allowed: ${this.allowedMimeTypes.join(', ')}`],
      });
    }

    const folder = dto.folder || 'uploads';
    const key = this.storageService.buildPublicFileKey(folder, dto.filename);
    const expiresIn = dto.expiresIn ?? (this.config.get<number>('app.presignedUrlExpiry') || 3600);
    const uploadUrl = await this.storageService.getPresignedUploadUrl(key, dto.mimeType, expiresIn);

    return { key, uploadUrl, expiresIn };
  }

  // ── Specific sub-routes BEFORE the wildcard redirect ──────────────────────

  @Get('files/:key(*)/presigned')
  @ApiOperation({ summary: 'Get a presigned download URL as JSON (no redirect)' })
  @ApiParam({ name: 'key', example: 'avatars/uuid.jpg' })
  @ApiResponse({ status: 200, description: 'Presigned URL returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getPresignedDownload(@Param('key') key: string) {
    try {
      await this.storageService.getMetadata(key);
    } catch {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }
    const expiresIn = this.config.get<number>('app.presignedUrlExpiry') || 3600;
    const url = await this.storageService.getPresignedUrl(key, expiresIn);
    return { key, url, expiresIn };
  }

  @Get('files/:key(*)/metadata')
  @ApiOperation({ summary: 'Get metadata for a file (size, mimeType, lastModified)' })
  @ApiParam({ name: 'key', example: 'avatars/uuid.jpg' })
  @ApiResponse({ status: 200, description: 'File metadata' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileMetadata(@Param('key') key: string) {
    try {
      return await this.storageService.getMetadata(key);
    } catch {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }
  }

  // ── Wildcard redirect — LAST among GET /files/:key routes ─────────────────

  @Get('files/:key(*)')
  @Public()
  @Redirect()
  @ApiOperation({ summary: 'Redirect to presigned download URL (use in <img src>)' })
  @ApiParam({ name: 'key', example: 'avatars/uuid.jpg' })
  @ApiResponse({ status: 302, description: 'Redirects to presigned URL' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(@Param('key') key: string) {
    try {
      await this.storageService.getMetadata(key);
    } catch {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }
    const url = await this.storageService.getPresignedUrl(key);
    return { url, statusCode: HttpStatus.FOUND };
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  @Delete('files/:key(*)')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file (admin+ only)' })
  @ApiParam({ name: 'key', example: 'avatars/uuid.jpg' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('key') key: string): Promise<void> {
    try {
      await this.storageService.getMetadata(key);
    } catch {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }
    await this.storageService.delete(key);
  }
}
