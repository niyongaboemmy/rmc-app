import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { POST_LANGUAGES } from './query-discussions.dto';
import { DISCUSSION_LIMITS } from '../discussions.constants';

/**
 * Submit a question for RMC to answer.
 *
 * There is NO `status` field, and there never will be. A submission is always born
 * `pending` and is invisible until an admin answers it; a client-settable status would be
 * a client-settable publication gate. `body` is MARKDOWN — the service stores it verbatim
 * and the reader gets sanitised HTML; the client never sends HTML.
 */
export class CreateQuestionDto {
  @ApiProperty({ minLength: DISCUSSION_LIMITS.MIN_TITLE_LENGTH, maxLength: 200 })
  @IsString()
  @MinLength(DISCUSSION_LIMITS.MIN_TITLE_LENGTH)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Markdown. Rendered + sanitised server-side on read.' })
  @IsString()
  @MinLength(DISCUSSION_LIMITS.MIN_BODY_LENGTH)
  // Generous ceiling: a long question is fine, but this is the wall against a
  // megabyte paste. Express's JSON limit sits above it, so an over-limit body is
  // rejected here as 400, not swallowed as a 500.
  @MaxLength(20000)
  body: string;

  @ApiPropertyOptional({ description: 'Category slug from the shared Dawah taxonomy.' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: POST_LANGUAGES })
  @IsIn(POST_LANGUAGES)
  language: (typeof POST_LANGUAGES)[number];
}
