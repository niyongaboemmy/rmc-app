import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

/** "Was this answer helpful?" — yes or no, from one browser. */
export class RateQuestionDto {
  /**
   * The reader's verdict. A STRING, deliberately, not a boolean.
   *
   * main.ts enables `enableImplicitConversion` globally, which coerces a boolean field
   * with `Boolean(value)` — and `Boolean("false")` is true. A client sending the string
   * "false" would have had its "not helpful" stored as helpful, with a 200 and nothing to
   * notice: the exact inversion of the signal this route exists to collect. Neither a
   * @Transform on the DTO nor a route-level pipe can undo it, because the global pipe runs
   * first and hands them a value that has already been coerced.
   *
   * 'yes'/'no' has no such failure mode — implicit conversion to String leaves a string
   * alone, and @IsIn rejects everything that is not one of the two words. It also reads
   * as what the UI actually asks. The column stays boolean; the service maps it.
   */
  @ApiProperty({ enum: ['yes', 'no'], description: "The reader's verdict" })
  @IsIn(['yes', 'no'])
  helpful: 'yes' | 'no';

  /**
   * The client's own random token, minted once and kept in localStorage.
   *
   * Constrained to an opaque string of a fixed size so the column cannot be used as
   * free-text storage, and never persisted raw — the service stores its SHA-256.
   */
  /**
   * Why it did not help — the chosen option's TEXT, from the list RMC maintains.
   *
   * Not validated against that list: it is CMS copy in three languages that an
   * admin edits freely, so the server would be re-reading and re-parsing editorial
   * content on every rating to reject a value the UI just offered. The length cap
   * is the real bound; the field is a label, never rendered as markup.
   */
  @ApiPropertyOptional({ maxLength: 160, description: 'Why the answer did not help.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string;

  /** A suggestion for improving the answer. Offered when the reader said yes. */
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  /**
   * Optional, so RMC can reply. Validated as an address so a typo is caught while
   * the reader is still looking at the form, rather than when somebody tries to
   * answer them weeks later.
   */
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiProperty({ description: 'Opaque browser token, 16-64 chars of [a-z0-9-]' })
  @IsString()
  @Length(16, 64)
  @Matches(/^[a-z0-9-]+$/i, { message: 'voterKey must be an opaque alphanumeric token' })
  voterKey: string;
}
