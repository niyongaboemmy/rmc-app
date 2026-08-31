import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
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

  /**
   * Extra detail beneath the question, in markdown.
   *
   * OPTIONAL, and usually absent on an admin-authored entry: there, the title is
   * the whole question ("Can I combine prayers when travelling?") and a second
   * box asking for the question again only invited it to be typed twice. It is
   * populated on MEMBER submissions, where the asker explains their situation,
   * and the admin form keeps the field for those so it stays correctable.
   */
  @ApiPropertyOptional({ description: 'Extra detail beneath the question, in markdown.' })
  @IsOptional()
  @IsString()
  @MaxLength(DISCUSSION_LIMITS.MAX_ADMIN_BODY_LENGTH)
  body?: string;

  @ApiProperty({ description: "RMC's answer, in markdown." })
  @IsString()
  @MinLength(DISCUSSION_LIMITS.MIN_BODY_LENGTH)
  @MaxLength(DISCUSSION_LIMITS.MAX_ADMIN_BODY_LENGTH)
  answerBody: string;

  /**
   * The short form of the ruling, shown in the listing. PLAIN TEXT, not markdown:
   * it renders as a lede, so there is nothing to render and nothing to sanitise.
   *
   * Optional on purpose — an admin may publish and summarise afterwards. Left
   * blank, the reader sees an excerpt derived from the answer, which is what the
   * list showed before this field existed.
   */
  @ApiPropertyOptional({ maxLength: 320, description: 'Plain-text summary for the listing.' })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  summary?: string;

  /**
   * One of "The Essential Answers" — the curated panel beside the feed.
   *
   * `@Transform` reads the RAW value off `obj` rather than the converted one.
   * The global ValidationPipe runs with `enableImplicitConversion`, which coerces
   * to the reflected type before validators see it — and for a boolean that turns
   * ANY non-empty string into `true`, so a stray `"false"` would silently mark an
   * entry essential. Reading `obj` gets the untouched JSON value, and @IsBoolean
   * then rejects a string with a 400 instead of guessing.
   */
  @ApiPropertyOptional({ description: 'Include in the curated Essential Answers panel.' })
  @IsOptional()
  @Transform(({ obj }) => (obj as Record<string, unknown>).isEssential)
  @IsBoolean()
  isEssential?: boolean;

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
  @MaxLength(DISCUSSION_LIMITS.MAX_ADMIN_BODY_LENGTH)
  answerBody: string;

  /**
   * The short form of the ruling, shown in the listing. PLAIN TEXT, not markdown:
   * it renders as a lede, so there is nothing to render and nothing to sanitise.
   *
   * Optional on purpose — an admin may publish and summarise afterwards. Left
   * blank, the reader sees an excerpt derived from the answer, which is what the
   * list showed before this field existed.
   */
  @ApiPropertyOptional({ maxLength: 320, description: 'Plain-text summary for the listing.' })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  summary?: string;

  @ApiPropertyOptional({ description: 'Category id — often only clear once answered.' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
