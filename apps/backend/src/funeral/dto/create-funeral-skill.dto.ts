import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateFuneralSkillDto {
  @IsString() @IsNotEmpty() @MaxLength(40)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/, { message: 'key must be a lowercase slug (a-z, 0-9, _ or -)' })
  key: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  labelEn: string;

  @IsOptional() @IsString() @MaxLength(120)
  labelRw?: string;

  @IsOptional() @IsString() @MaxLength(120)
  labelAr?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
