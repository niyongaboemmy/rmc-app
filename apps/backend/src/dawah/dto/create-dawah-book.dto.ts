import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID,
  Matches, Max, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BOOK_LANGUAGES, type BookLanguage } from '../entities/dawah-book.entity';
import { ContentStatus } from '../entities/dawah-course.entity';

/**
 * Payload for a library book.
 *
 * fileKey / fileName / fileSize are REQUIRED and come from the upload endpoint
 * (POST /admin/dawah/books/upload, Phase 2B), which returns exactly that shape.
 * A book row with no file is a card that 404s when clicked, so the schema makes
 * it impossible — file_key is NOT NULL.
 *
 * view_count / download_count are absent: they are counters the service owns,
 * and forbidNonWhitelisted 400s a client that tries to set them.
 */
export class CreateDawahBookDto {
  @ApiPropertyOptional({ description: 'Derived from titleEn when omitted. Immutable once published.' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  @MaxLength(140)
  slug?: string;

  @ApiPropertyOptional({ description: 'Null clears the category.' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @ApiProperty({ example: 'Riyad as-Salihin' })
  @IsString()
  @MaxLength(200)
  titleEn: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleRw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleAr?: string;

  @ApiPropertyOptional({ description: 'Not translated — a name reads the same in every locale.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionRw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({
    enum: BOOK_LANGUAGES,
    default: 'en',
    description: 'Language the book is WRITTEN in — not the catalogue copy.',
  })
  @IsOptional()
  @IsIn(BOOK_LANGUAGES)
  language?: BookLanguage;

  @ApiPropertyOptional({ description: 'file-server key under the PUBLIC dawah-covers/ prefix.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageKey?: string | null;

  @ApiProperty({
    description: 'file-server key under the PROTECTED dawah-library/ prefix. From the upload endpoint. Never returned on a public route.',
  })
  @IsString()
  @MaxLength(500)
  fileKey: string;

  @ApiProperty({ description: 'Original filename, as the admin uploaded it.' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ description: 'Bytes. Uploads are capped at 25 MB (plan §10).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiPropertyOptional({ default: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  pageCount?: number | null;

  @ApiPropertyOptional({
    default: true,
    description: 'False hides the Download button AND 403s the download route. A deterrent, not DRM.',
  })
  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
