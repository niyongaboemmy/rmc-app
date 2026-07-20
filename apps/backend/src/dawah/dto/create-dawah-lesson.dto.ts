import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonContentType } from '../entities/dawah-course-lesson.entity';

/**
 * Payload for one entry in a course outline. `courseId` is absent on purpose —
 * it comes from the route (POST /admin/dawah/courses/:id/lessons), so it can't
 * be spoofed to attach a lesson to a course the caller wasn't addressing.
 *
 * mediaKey / mediaUrl / non-text contentType are accepted but nothing renders
 * them yet — media resources are Phase 7 (plan §4.3). They are declared here
 * because forbidNonWhitelisted would otherwise 400 a client that sends them,
 * and the whole point of shipping the columns early was to avoid an API break.
 */
export class CreateDawahLessonDto {
  @ApiProperty({ example: 'Introduction to Tajweed' })
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

  @ApiPropertyOptional({ description: 'One line, shown in the collapsed outline.' })
  @IsOptional()
  @IsString()
  summaryEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summaryRw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summaryAr?: string;

  @ApiPropertyOptional({ description: 'Rich HTML — the lesson itself.' })
  @IsOptional()
  @IsString()
  bodyEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyRw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyAr?: string;

  @ApiPropertyOptional({ enum: LessonContentType, default: LessonContentType.TEXT })
  @IsOptional()
  @IsEnum(LessonContentType)
  contentType?: LessonContentType;

  @ApiPropertyOptional({ description: 'DEFERRED (Phase 7) — file-server key for hosted media.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaKey?: string | null;

  @ApiPropertyOptional({ description: 'DEFERRED (Phase 7) — external media URL (YouTube, …).' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  mediaUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ description: 'Appended to the end of the outline when omitted.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Readable as a taster even when the course is gated.' })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}
