import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTOs for the admin-managed content served by PublicController.
 * These replace the previous `@Body() dto: any` handlers so that invalid or
 * incomplete payloads return a clean 400 instead of hitting the DB and
 * throwing a 500. Every field an existing admin form sends is included, so
 * the global whitelist pipe won't reject legitimate submissions.
 */

// ── Verse of the Day ──
export class CreateVerseDto {
  @ApiProperty() @IsInt() @Min(1) @Max(114) surah: number;
  @ApiProperty() @IsInt() @Min(1) ayah: number;
  @ApiProperty() @IsString() @IsNotEmpty() arabicText: string;
  @ApiProperty() @IsString() @IsNotEmpty() translationEn: string;
  @ApiPropertyOptional() @IsOptional() @IsString() translationRw?: string | null;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) reference: string;
  @ApiProperty({ description: 'ISO date (YYYY-MM-DD); unique per day' })
  @IsDateString()
  displayDate: string;
}
export class UpdateVerseDto extends PartialType(CreateVerseDto) {}

// ── Announcements / Tenders ──
export class CreateAnnouncementDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @ApiProperty() @IsString() @IsNotEmpty() content: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() titleI18n?: Record<string, string> | null;
  @ApiPropertyOptional() @IsOptional() @IsObject() contentI18n?: Record<string, string> | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) slug?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsIn(['normal', 'high', 'urgent']) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) targetAudience?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() targetId?: string | null;
  @ApiProperty() @IsDateString() publishAt: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsIn(['announcement', 'tender']) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachments?: unknown[];
}
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}

// ── Gallery ──
export class CreateGalleryItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string | null;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) fileKey: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) thumbnailKey?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) mediumKey?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) fileType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
}
export class UpdateGalleryItemDto extends PartialType(CreateGalleryItemDto) {}

// ── Blog ──
export class CreateBlogPostDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) title: string;
  @ApiPropertyOptional({ description: 'URL slug; derived from title when omitted' })
  @IsOptional() @IsString() @MaxLength(280) slug?: string;
  @ApiProperty() @IsString() @IsNotEmpty() content: string;
  @ApiPropertyOptional() @IsOptional() @IsString() excerpt?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) featuredImage?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsIn(['draft', 'published', 'archived']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) seoTitle?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() seoDescription?: string | null;
}
export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}
