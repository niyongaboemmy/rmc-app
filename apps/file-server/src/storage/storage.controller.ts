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
  InternalServerErrorException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Res,
  Headers,
} from '@nestjs/common';
import { Response } from 'express';
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
import { SkipThrottle } from '@nestjs/throttler';
import { StorageService } from './storage.service';
import { UploadSettingsService } from './upload-settings.service';
import { PresignedUploadDto } from './dto/presigned-upload.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles, Role } from '../common/decorators/roles.decorator';

@ApiTags('files')
@ApiBearerAuth()
@Controller()
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
    private readonly uploadSettings: UploadSettingsService,
  ) {}

  // ── Upload ────────────────────────────────────────────────────────────────

  @Post('upload')
  // Bulk gallery uploads fire several requests per image (3 versions each). Skip
  // the aggressive per-second burst limiter; the 'medium' window still applies.
  @SkipThrottle({ short: true })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 524288000 } }))
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
    const constraints = await this.uploadSettings.getConstraints();
    if (constraints.allowedMimeTypes.length && !constraints.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_MIME_TYPE',
        message: `MIME type "${file.mimetype}" is not allowed`,
        details: [`Allowed: ${constraints.allowedMimeTypes.join(', ')}`],
      });
    }
    if (constraints.maxFileSize > 0 && file.size > constraints.maxFileSize) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `File size ${file.size} exceeds the limit of ${constraints.maxFileSize} bytes`,
      });
    }

    let result: Awaited<ReturnType<StorageService['upload']>>;
    try {
      result = await this.storageService.upload(
        file.buffer,
        file.originalname,
        file.mimetype,
        folder || 'uploads',
      );
    } catch (err: any) {
      throw new InternalServerErrorException({
        code: 'STORAGE_ERROR',
        message: err?.message ?? 'Failed to store file — check storage configuration',
      });
    }

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
    const constraints = await this.uploadSettings.getConstraints();
    if (constraints.allowedMimeTypes.length && !constraints.allowedMimeTypes.includes(dto.mimeType)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_MIME_TYPE',
        message: `MIME type "${dto.mimeType}" is not allowed`,
        details: [`Allowed: ${constraints.allowedMimeTypes.join(', ')}`],
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

  // ── Wildcard stream — LAST among GET /files/:key routes ───────────────────

  @Get('files/:key(*)')
  @Public()
  // Image-heavy pages request many files at once (a gallery grid fires dozens of
  // <img> loads in parallel). Skip throttling on read-only file serving so those
  // bursts don't 429 — abuse protection still applies to upload/delete.
  // NB: throttlers are named 'short'/'medium', so both must be named explicitly
  // (a bare @SkipThrottle() only skips a throttler named 'default').
  @SkipThrottle({ short: true, medium: true })
  @ApiOperation({ summary: 'Redirect to presigned download URL (use in <img src>)' })
  @ApiOperation({ summary: 'Stream a file inline (use in <img src> / iframe / <a>)' })
  @ApiParam({ name: 'key', example: 'avatars/uuid.jpg' })
  @ApiResponse({ status: 200, description: 'File bytes streamed' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(
    @Param('key') key: string,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    let file: Awaited<ReturnType<StorageService['getObject']>>;
    try {
      file = await this.storageService.getObject(key, range);
    } catch {
      res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
      });
      return;
    }

    res.setHeader('Content-Type', file.contentType);
    // Show in the browser rather than forcing a download.
    res.setHeader('Content-Disposition', file.contentDisposition || 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (file.acceptRanges) res.setHeader('Accept-Ranges', file.acceptRanges);
    if (file.contentLength != null) res.setHeader('Content-Length', String(file.contentLength));

    // Honour byte-range requests (PDF viewers / video seeking).
    if (range && file.contentRange) {
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.setHeader('Content-Range', file.contentRange);
    }

    file.body.on('error', () => {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
      } else {
        res.end();
      }
    });
    file.body.pipe(res);
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
