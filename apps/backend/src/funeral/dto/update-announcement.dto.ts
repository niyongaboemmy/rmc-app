import { IsDateString, IsInt, IsOptional, IsString, Min, MaxLength, ValidateIf } from 'class-validator';

export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @MaxLength(150)
  name?: string;

  @IsOptional() @IsInt() @Min(0)
  age?: number;

  @ValidateIf((o) => o.dateOfDeath !== undefined && o.dateOfDeath !== null && o.dateOfDeath !== '')
  @IsDateString()
  dateOfDeath?: string;

  @IsOptional() @IsString() @MaxLength(200)
  janazahLocation?: string;

  @IsOptional() @IsDateString()
  prayerTime?: string;

  @IsOptional() @IsString() @MaxLength(200)
  burialLocation?: string;

  @IsOptional() @IsString()
  verse?: string;

  @IsOptional() @IsString() @MaxLength(500)
  photoUrl?: string;
}
