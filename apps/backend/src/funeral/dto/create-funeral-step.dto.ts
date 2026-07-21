import { IsBoolean, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateFuneralStepDto {
  /** Stable slug (lowercase, snake/kebab). Immutable once created. */
  @IsString() @IsNotEmpty() @MaxLength(40)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/, { message: 'key must be a lowercase slug (a-z, 0-9, _ or -)' })
  key: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  titleEn: string;

  @IsOptional() @IsString() @MaxLength(120)
  titleRw?: string;

  @IsOptional() @IsString() @MaxLength(120)
  titleAr?: string;

  @IsOptional() @IsString()
  descriptionEn?: string;

  @IsOptional() @IsString()
  descriptionRw?: string;

  @IsOptional() @IsString()
  descriptionAr?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsHexColor()
  color?: string;

  @IsOptional() @IsString() @MaxLength(40)
  icon?: string;
}
