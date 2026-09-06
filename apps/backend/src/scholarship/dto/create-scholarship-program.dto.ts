import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const blankToUndefined = Transform(({ value }) => (value === '' ? undefined : value));

/**
 * Trilingual copy. Each language is individually optional — an admin drafting in
 * English should not be blocked — but `publish` refuses an opportunity whose
 * English title or description is empty. The requirement belongs at the moment
 * of going public, not at the moment of saving a draft.
 */
export class I18nTextDto {
  @ApiPropertyOptional() @IsOptional() @IsString() en?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rw?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ar?: string;
}

export class RequiredDocumentDto {
  @ApiProperty({ example: 'transcript' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 40)
  key!: string;

  @ApiProperty({ type: I18nTextDto })
  @ValidateNested()
  @Type(() => I18nTextDto)
  label!: I18nTextDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

/**
 * Creating an opportunity always yields a DRAFT.
 *
 * There is deliberately no `status` field here or on the update DTO: going live
 * is its own action (`POST /:id/publish`) with its own validation, so a
 * half-written scholarship cannot reach the public page through a stray PATCH.
 */
export class CreateScholarshipProgramDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 200) title!: string;

  @ApiProperty() @IsString() @IsNotEmpty() description!: string;

  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  titleI18n?: I18nTextDto;

  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  descriptionI18n?: I18nTextDto;

  @ApiPropertyOptional({ type: [RequiredDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredDocumentDto)
  requiredDocuments?: RequiredDocumentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: Array<{ key: string; name: string; mimeType: string; size: number }>;

  /**
   * The education level key, as defined in the Scholarships CMS section.
   *
   * No longer an enum. The levels are admin-managed content — RMC can add
   * "Primary" or drop "TVET" without a deploy — so the server cannot hold a
   * closed list of them. Bounded by the column width instead; the key an admin
   * picks always comes from a dropdown built from that same list.
   *
   * This is the level an OFFER is aimed at. The application once carried a
   * level of its own; it was dropped in migration 079, because the form had
   * stopped asking and sent the same value for everyone.
   */
  @ApiPropertyOptional({ description: 'Level key from the Scholarships CMS section' })
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(1, 20)
  level?: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsInt() @Min(1) slots?: number;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsDateString() opensAt?: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsDateString() deadline?: string;

  /** @deprecated Retained so the existing admin form keeps working; `status` rules. */
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isOpen?: boolean;
}
