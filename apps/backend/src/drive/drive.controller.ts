import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver') as (format: string, opts?: object) => any;
import * as https from 'https';
import * as http from 'http';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DriveService } from './drive.service';
import { ConfigService } from '@nestjs/config';
import { CreateFolderDto } from './dto/create-folder.dto';
import { AddFileDto } from './dto/add-file.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ShareItemDto } from './dto/share-item.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';

@ApiTags('drive')
@ApiBearerAuth()
@Controller('drive')
export class DriveController {
  private readonly fileServerUrl: string;

  constructor(
    private readonly driveService: DriveService,
    private readonly config: ConfigService,
  ) {
    this.fileServerUrl = this.config.get<string>('app.fileServerUrl') || 'http://localhost:3002';
  }

  // ── List & Search ──────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'List items in a folder (or root)' })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'trashed', required: false, type: Boolean })
  listItems(
    @Req() req: any,
    @Query('parentId') parentId?: string,
    @Query('trashed') trashed?: string,
  ) {
    return this.driveService.listItems(req.user.id, parentId, trashed === 'true');
  }

  @Get('shared-with-me')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'List items shared with the current user' })
  listSharedWithMe(@Req() req: any) {
    return this.driveService.listSharedWithMe(req.user.id);
  }

  @Get('starred')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'List starred items' })
  listStarred(@Req() req: any) {
    return this.driveService.listStarred(req.user.id);
  }

  @Get('trash')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'List trashed items' })
  listTrash(@Req() req: any) {
    return this.driveService.listTrashed(req.user.id);
  }

  @Get('search')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'Search items by name' })
  @ApiQuery({ name: 'q', required: true })
  search(@Req() req: any, @Query('q') q: string) {
    return this.driveService.search(req.user.id, q);
  }

  @Get('stats')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'Storage usage stats' })
  stats(@Req() req: any) {
    return this.driveService.getStorageStats(req.user.id);
  }

  @Get('users/search')
  @RequirePermissions(Permission.DRIVE_SHARE)
  @ApiOperation({ summary: 'Search users to share with' })
  @ApiQuery({ name: 'q', required: true })
  searchUsers(@Req() req: any, @Query('q') q: string) {
    return this.driveService.searchUsers(q, req.user.id);
  }

  // ── Admin routes ──────────────────────────────────────────────────────────

  @Get('admin/all')
  @RequirePermissions(Permission.DRIVE_ADMIN)
  @ApiOperation({ summary: 'Admin: browse all files' })
  @ApiQuery({ name: 'parentId', required: false })
  adminListAll(@Query('parentId') parentId?: string) {
    return this.driveService.adminListAll(parentId);
  }

  @Get('admin/user/:userId')
  @RequirePermissions(Permission.DRIVE_ADMIN)
  @ApiOperation({ summary: 'Admin: list all files for a specific user' })
  @ApiParam({ name: 'userId' })
  adminUserFiles(@Param('userId') userId: string) {
    return this.driveService.adminListUserFiles(userId);
  }

  @Get('admin/user/:userId/shared-with')
  @RequirePermissions(Permission.DRIVE_ADMIN)
  @ApiOperation({ summary: 'Admin: list items shared with a specific user' })
  @ApiParam({ name: 'userId' })
  adminSharedWithUser(@Param('userId') userId: string) {
    return this.driveService.adminListSharedWithUser(userId);
  }

  // ── File proxy (must be before :id routes) ───────────────────────────────

  @Get('proxy')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'Proxy file content from file-server with JWT auth' })
  @ApiQuery({ name: 'key', required: true })
  proxyFile(@Query('key') key: string, @Res() res: Response) {
    if (!key) return res.status(400).json({ message: 'key is required' });
    const fileUrl = `${this.fileServerUrl}/api/v1/files/${key}`;
    const proto = fileUrl.startsWith('https') ? https : http;

    const req = proto.get(fileUrl, (stream: any) => {
      if (stream.statusCode && stream.statusCode >= 400) {
        return res.status(stream.statusCode).json({ message: 'File not found' });
      }
      res.set('Content-Type', stream.headers['content-type'] || 'application/octet-stream');
      if (stream.headers['content-length']) {
        res.set('Content-Length', stream.headers['content-length']);
      }
      res.set('Cache-Control', 'private, max-age=3600');
      res.set('Content-Disposition', 'inline');
      stream.pipe(res);
    });
    req.on('error', () => {
      if (!res.headersSent) {
        res.status(502).json({ message: 'File server unavailable' });
      }
    });
  }

  // ── Single item ───────────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'Get a single item' })
  getItem(@Req() req: any, @Param('id') id: string) {
    return this.driveService.getItem(id, req.user.id);
  }

  @Get(':id/breadcrumb')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'Get folder breadcrumb path' })
  getBreadcrumb(@Req() req: any, @Param('id') id: string) {
    return this.driveService.getBreadcrumb(id, req.user.id);
  }

  @Get(':id/shares')
  @RequirePermissions(Permission.DRIVE_SHARE)
  @ApiOperation({ summary: 'List shares for an item' })
  listShares(@Req() req: any, @Param('id') id: string) {
    return this.driveService.listShares(id, req.user.id);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  @Post('folders')
  @RequirePermissions(Permission.DRIVE_CREATE)
  @ApiOperation({ summary: 'Create a new folder' })
  createFolder(@Req() req: any, @Body() dto: CreateFolderDto) {
    return this.driveService.createFolder(req.user.id, dto);
  }

  @Post('files')
  @RequirePermissions(Permission.DRIVE_CREATE)
  @ApiOperation({ summary: 'Register a file after upload to file-server' })
  addFile(@Req() req: any, @Body() dto: AddFileDto) {
    return this.driveService.addFile(req.user.id, dto);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.DRIVE_EDIT)
  @ApiOperation({ summary: 'Rename / update item metadata' })
  updateItem(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.driveService.updateItem(id, req.user.id, dto);
  }

  // ── Move & Copy ───────────────────────────────────────────────────────────

  @Post(':id/move')
  @RequirePermissions(Permission.DRIVE_EDIT)
  @ApiOperation({ summary: 'Move item to another folder (or root)' })
  moveItem(@Req() req: any, @Param('id') id: string, @Body() dto: MoveItemDto) {
    return this.driveService.moveItem(id, req.user.id, dto);
  }

  @Post(':id/copy')
  @RequirePermissions(Permission.DRIVE_CREATE)
  @ApiOperation({ summary: 'Copy item to another folder (or root)' })
  copyItem(@Req() req: any, @Param('id') id: string, @Body() dto: MoveItemDto) {
    return this.driveService.copyItem(id, req.user.id, dto.targetFolderId ?? undefined);
  }

  // ── Trash & Delete ────────────────────────────────────────────────────────

  @Post(':id/trash')
  @RequirePermissions(Permission.DRIVE_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move item to trash' })
  trashItem(@Req() req: any, @Param('id') id: string) {
    return this.driveService.trashItem(id, req.user.id);
  }

  @Post(':id/restore')
  @RequirePermissions(Permission.DRIVE_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore item from trash' })
  restoreItem(@Req() req: any, @Param('id') id: string) {
    return this.driveService.restoreItem(id, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DRIVE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete item' })
  permanentDelete(@Req() req: any, @Param('id') id: string) {
    return this.driveService.permanentDelete(id, req.user.id);
  }

  // ── Sharing ───────────────────────────────────────────────────────────────

  @Post(':id/share')
  @RequirePermissions(Permission.DRIVE_SHARE)
  @ApiOperation({ summary: 'Share item with one or more users' })
  shareItem(@Req() req: any, @Param('id') id: string, @Body() dto: ShareItemDto) {
    return this.driveService.shareItem(id, req.user.id, dto);
  }

  @Delete(':id/shares/:shareId')
  @RequirePermissions(Permission.DRIVE_SHARE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a share from an item' })
  removeShare(@Req() req: any, @Param('id') id: string, @Param('shareId') shareId: string) {
    return this.driveService.removeShare(id, shareId, req.user.id);
  }

  // ── Zip download ─────────────────────────────────────────────────────────

  @Get(':id/download-zip')
  @RequirePermissions(Permission.DRIVE_VIEW)
  @ApiOperation({ summary: 'Download a folder as a zip archive' })
  async downloadZip(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const isAdmin =
      (req.user?.permissions ?? []).includes('drive:admin') ||
      (req.user?.permissions ?? []).includes('*');
    const files = await this.driveService.getDescendantFiles(id, req.user.id, isAdmin);
    const item = await this.driveService.getItem(id, req.user.id, isAdmin);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${item.name}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const file of files) {
      if (!file.storageKey) continue;
      const fileUrl = `${this.fileServerUrl}/api/v1/files/${file.storageKey}`;
      await new Promise<void>((resolve, reject) => {
        const proto = fileUrl.startsWith('https') ? https : http;
        proto
          .get(fileUrl, (stream) => {
            archive.append(stream as any, { name: file.name });
            stream.on('end', resolve);
            stream.on('error', reject);
          })
          .on('error', reject);
      });
    }

    await archive.finalize();
  }
}
