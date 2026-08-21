import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { POST_LANGUAGES } from './query-discussions.dto';
import { DISCUSSION_LIMITS } from '../discussions.constants';

/**
 * Author a complete Q&A entry — question and answer together.
 *
 * There is NO `status` field, and there never will be: a client-settable status is a
 * client-settable publication gate. Creating an entry publishes it, because an entry with
 * an answer has nothing left to wait for.
 *
 * Both `body` and `answerBody` are MARKDOWN. The service stores them verbatim and readers
 * get sanitised HTML; the client never sends HTML.
 */
export class CreateEntryDto {
  @ApiProperty({ minLength: DISCUSSION_LIMITS.MIN_TITLE_LENGTH, maxLength: 200 })
  @IsString()
  @MinLength(DISCUSSION_LIMITS.MIN_TITLE_LENGTH)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'The question, in markdown.' })
  @IsString()
  @MinLength(DISCUSSION_LIMITS.MIN_BODY_LENGTH)
  @MaxLength(20000)
  body: string;

  @ApiProperty({ description: "RMC's answer, in markdown." })
  @IsString()
  @MinLength(DISCUSSION_LIMITS.MIN_BODY_LENGTH)
  @MaxLength(20000)
  answerBody: string;

  @ApiPropertyOptional({ description: 'Category id from the shared Dawah taxonomy.' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: POST_LANGUAGES })
  @IsIn(POST_LANGUAGES)
  language: (typeof POST_LANGUAGES)[number];
}

/**
 * Answer a member's pending submission.
 *
 * The question itself is not editable here — correcting somebody's wording while answering
 * them is a different act, and it belongs to `updateEntry` where it is visible as an edit.
 * The category is settable because answering is usually the moment it becomes clear what
 * the question actually was.
 */
export class AnswerQuestionDto {
  @ApiProperty({ description: "RMC's answer, in markdown." })
  @IsString()
  @MinLength(DISCUSSION_LIMITS.MIN_BODY_LENGTH)
  @MaxLength(20000)
  answerBody: string;

  @ApiPropertyOptional({ description: 'Category id — often only clear once answered.' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
