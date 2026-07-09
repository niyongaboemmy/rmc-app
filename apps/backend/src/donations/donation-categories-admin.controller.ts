import { Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DonationCategoriesService } from './donation-categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubFundDto,
  UpdateSubFundDto,
} from './dto/category-content.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';

@ApiTags('Donations — Admin')
@Controller('admin/donations/categories')
@ApiBearerAuth()
export class DonationCategoriesAdminController {
  constructor(private readonly service: DonationCategoriesService) {}

  @Get()
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'List donation categories + sub-funds (full multilingual)' })
  list() {
    return this.service.adminList();
  }

  @Get('deleted')
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'List archived (soft-deleted) donation categories' })
  listDeleted() {
    return this.service.adminListDeletedCategories();
  }

  // ── Categories ──────────────────────────────────────────────────────────────

  @Post()
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Create a donation category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch(':id')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Update a donation category' })
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Archive (soft-delete) a donation category (sub-funds preserved)' })
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteCategory(id);
  }

  @Post(':id/restore')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Restore an archived (soft-deleted) donation category' })
  restoreCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.restoreCategory(id);
  }

  // ── Sub-funds ────────────────────────────────────────────────────────────────

  @Post(':categoryId/subfunds')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Create a sub-fund under a category' })
  createSubFund(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: CreateSubFundDto,
  ) {
    return this.service.createSubFund(categoryId, dto);
  }

  @Patch('subfunds/:subId')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Update a sub-fund' })
  updateSubFund(@Param('subId', ParseUUIDPipe) subId: string, @Body() dto: UpdateSubFundDto) {
    return this.service.updateSubFund(subId, dto);
  }

  @Delete('subfunds/:subId')
  @Permissions(Permission.DONATIONS_MANAGE)
  @ApiOperation({ summary: 'Delete a sub-fund' })
  deleteSubFund(@Param('subId', ParseUUIDPipe) subId: string) {
    return this.service.deleteSubFund(subId);
  }
}
