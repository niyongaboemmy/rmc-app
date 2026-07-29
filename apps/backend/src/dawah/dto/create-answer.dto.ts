import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DISCUSSION_LIMITS } from '../discussions.constants';

/**
 * Answer a question. NO `status` — it is COMPUTED from the question's category
 * answer_policy (scholar_review → pending_review, open → published). A client-settable
 * status would be a client-settable publication gate on exactly the content — religious
 * rulings — where that must never be possible.
 */
export class CreateAnswerDto {
  @ApiProperty({ description: 'Markdown. Rendered + sanitised server-side on read.' })
  @IsString()
  @MinLength(DISCUSSION_LIMITS.MIN_BODY_LENGTH)
  @MaxLength(20000)
  body: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
