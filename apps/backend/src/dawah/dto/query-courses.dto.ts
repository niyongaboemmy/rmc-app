import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  COURSE_LANGUAGES, ContentStatus, CourseLevel, type CourseLanguage,
} from '../entities/dawah-course.entity';

/** Filters for both the public course listing and the admin one. */
export class QueryCoursesDto {
  @ApiPropertyOptional({ description: 'Category slug or id — either resolves.' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  category?: string;

  @ApiPropertyOptional({ enum: CourseLevel })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({ enum: COURSE_LANGUAGES })
  @IsOptional()
  @IsIn(COURSE_LANGUAGES)
  language?: CourseLanguage;

  /** Matches the title in any of the three locales, plus the English summary. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  /**
   * Admin-only in practice. listPublic() ignores it and forces 'published' —
   * it is declared here rather than on a separate DTO because
   * forbidNonWhitelisted would otherwise 400 the admin list when it filters by
   * draft, and the two listings share every other filter.
   */
  @ApiPropertyOptional({ enum: ContentStatus, description: 'Ignored on public routes.' })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
