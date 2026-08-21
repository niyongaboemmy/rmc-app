import { IsBoolean, IsHexColor, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/** Everything editable on a step. `key` is immutable, so it is not accepted here. */
export class UpdateFuneralStepDto {
  @IsOptional() @IsString() @MaxLength(120)
  titleEn?: string;

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
