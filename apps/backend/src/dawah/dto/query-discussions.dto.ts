import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const POST_LANGUAGES = ['en', 'rw', 'ar'] as const;
export const DISCUSSION_SORTS = ['active', 'new', 'unanswered'] as const;
export type DiscussionSort = (typeof DISCUSSION_SORTS)[number];

/**
 * Filters for the public discussions listing.
 *
 * Note what is NOT here: `status`. QueryBooksDto carries one because an admin listing
 * shares the DTO; discussions have no admin listing in Phase A, and a status filter on a
 * public route is a way to ask the API for hidden content. If Phase D needs one, it goes
 * on a separate admin DTO behind DISCUSSIONS_MODERATE — not here.
 */
export class QueryDiscussionsDto {
  @ApiPropertyOptional({ description: 'Category slug — the shared Dawah taxonomy.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({
    enum: POST_LANGUAGES,
    description: 'The language a member WROTE in. Not a translation axis — see plan §4.',
  })
  @IsOptional()
  @IsIn(POST_LANGUAGES)
  language?: (typeof POST_LANGUAGES)[number];

  @ApiPropertyOptional({
    enum: DISCUSSION_SORTS,
    default: 'active',
    description: '`unanswered` SORTS unanswered first; it does not hide answered questions.',
  })
  @IsOptional()
  @IsIn(DISCUSSION_SORTS)
  sort?: DiscussionSort = 'active';

  /** Accepted and ignored until Phase D wires the GIN index (plan §7). */
  @ApiPropertyOptional({ description: 'Reserved — full-text search lands in Phase D.' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 12, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}
