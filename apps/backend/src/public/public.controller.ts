import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/jwt-payload.interface';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly service: PublicService) {}

  // ── Verse of Day ──
  @Get('verse-of-day')
  @Public()
  @ApiOperation({ summary: 'Get verse of the day' })
  getVerse() {
    return this.service.getVerseOfDay();
  }

  @Post('verse-of-day')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createVerse(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.service.createVerse({ ...dto, createdBy: user.sub });
  }

  // ── Announcements ──
  @Get('announcements')
  @Public()
  @ApiOperation({ summary: 'Get active announcements' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type: announcement | tender' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'includeExpired',
    required: false,
    type: Boolean,
    description: 'Include expired/closed items (default: false)',
  })
  getAnnouncements(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('includeExpired') includeExpired?: string,
  ) {
    return this.service.getActiveAnnouncements(
      type,
      limit ? parseInt(limit, 10) : 10,
      includeExpired === 'true',
    );
  }

  @Get('announcements/admin-all')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Get all announcements including unpublished (admin)' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  adminGetAllAnnouncements(@Query('type') type?: string, @Query('limit') limit?: string) {
    return this.service.adminGetAllAnnouncements(type, limit ? parseInt(limit, 10) : 100);
  }

  @Get('announcements/:id')
  @Public()
  @ApiOperation({ summary: 'Get a single announcement/tender by ID' })
  getAnnouncementById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getAnnouncementById(id);
  }

  @Post('announcements')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createAnnouncement(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.service.createAnnouncement({ ...dto, createdBy: user.sub });
  }

  @Put('announcements/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  updateAnnouncement(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.updateAnnouncement(id, dto);
  }

  @Delete('announcements/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  deleteAnnouncement(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteAnnouncement(id);
  }

  // ── Blog ──
  @Get('blog/posts')
  @Public()
  @ApiOperation({ summary: 'Get published blog posts' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  getPosts(@Query('category') category?: string, @Query('page') page?: string) {
    return this.service.getPublishedPosts(category, page ? parseInt(page) : 1);
  }

  @Get('blog/categories')
  @Public()
  @ApiOperation({ summary: 'Get blog categories' })
  getCategories() {
    return this.service.getCategories();
  }

  @Get('blog/posts/:slug')
  @Public()
  @ApiOperation({ summary: 'Get blog post by slug' })
  getPost(@Param('slug') slug: string) {
    return this.service.getPostBySlug(slug);
  }

  @Post('blog/posts')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR)
  createPost(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.service.createPost({ ...dto, authorId: user.sub });
  }

  @Put('blog/posts/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR)
  updatePost(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.updatePost(id, dto);
  }

  // ── Gallery ──
  @Get('gallery')
  @Public()
  @ApiOperation({ summary: 'Get public gallery items' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  getGallery(@Query('category') category?: string, @Query('page') page?: string) {
    return this.service.getGallery(category, page ? parseInt(page) : 1);
  }

  @Get('gallery/admin-all')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Get all gallery items for admin (includes private)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  adminGetGallery(@Query('category') category?: string, @Query('page') page?: string) {
    return this.service.adminGetGallery(category, page ? parseInt(page) : 1);
  }

  @Post('gallery')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  addGalleryItem(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.addGalleryItem({ ...dto, uploadedBy: userId });
  }

  @Put('gallery/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Update gallery item metadata' })
  updateGalleryItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.updateGalleryItem(id, dto);
  }

  @Delete('gallery/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  deleteGalleryItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteGalleryItem(id);
  }
}
