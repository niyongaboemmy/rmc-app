import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  COURSE_LANGUAGES,
  ContentStatus,
  CourseFormat,
  CourseLevel,
  type CourseLanguage,
} from '../entities/dawah-course.entity';

/**
 * Payload for a course. `lessonCount` and `publishedAt` are absent by design:
 * the first is a denormalised counter the service maintains from the lesson
 * table, the second is stamped by setStatus(). Both are derived state, and the
 * global ValidationPipe runs forbidNonWhitelisted — so an admin client that
 * tries to send either gets a 400 rather than silently corrupting them.
 */
export class CreateDawahCourseDto {
  @ApiPropertyOptional({
    description: 'Derived from titleEn when omitted. Immutable once published.',
    example: 'foundations-of-quran-recitation',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  @MaxLength(140)
  slug?: string;

  @ApiPropertyOptional({ description: 'Null clears the category.' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @ApiProperty({ example: 'Foundations of Qur’an Recitation' })
  @IsString()
  @MaxLength(160)
  titleEn: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titleRw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  titleAr?: string;

  @ApiProperty({ description: 'Card blurb. Plain text.' })
  @IsString()
  @MaxLength(300)
  summaryEn: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  summaryRw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  summaryAr?: string;

  @ApiPropertyOptional({ description: 'Rich HTML, rendered on the detail page.' })
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

  @ApiPropertyOptional({ enum: CourseLevel, default: CourseLevel.BEGINNER })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({
    enum: COURSE_LANGUAGES,
    default: 'en',
    description: 'Language the course is TAUGHT in — not the catalogue copy.',
  })
  @IsOptional()
  @IsIn(COURSE_LANGUAGES)
  language?: CourseLanguage;

  @ApiPropertyOptional({ enum: CourseFormat, default: CourseFormat.SELF_PACED })
  @IsOptional()
  @IsEnum(CourseFormat)
  format?: CourseFormat;

  @ApiPropertyOptional({ description: 'file-server key under the public dawah-covers/ prefix.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageKey?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  instructorName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  instructorTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructorPhotoKey?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ description: 'Shown in the landing page outline. Capped at 6 there.' })
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
