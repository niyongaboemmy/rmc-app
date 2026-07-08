import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/** `key` is immutable, so it is not accepted here. */
export class UpdateFuneralSkillDto {
  @IsOptional() @IsString() @MaxLength(120)
  labelEn?: string;

  @IsOptional() @IsString() @MaxLength(120)
  labelRw?: string;

  @IsOptional() @IsString() @MaxLength(120)
  labelAr?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
