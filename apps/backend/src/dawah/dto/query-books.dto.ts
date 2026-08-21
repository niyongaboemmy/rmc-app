import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BOOK_LANGUAGES, type BookLanguage } from '../entities/dawah-book.entity';
import { ContentStatus } from '../entities/dawah-course.entity';

/** Filters for both the public library listing and the admin one. */
export class QueryBooksDto {
  @ApiPropertyOptional({ description: 'Category slug or id — either resolves.' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  category?: string;

  @ApiPropertyOptional({ enum: BOOK_LANGUAGES })
  @IsOptional()
  @IsIn(BOOK_LANGUAGES)
  language?: BookLanguage;

  /** Matches the title in any of the three locales, plus the author. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  /** Admin-only in practice — listPublic() ignores it and forces 'published'. */
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
