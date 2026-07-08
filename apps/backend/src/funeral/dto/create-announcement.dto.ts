import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength, ValidateIf } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name: string;

  @IsOptional() @IsInt() @Min(0)
  age?: number;

  @ValidateIf((o) => o.dateOfDeath !== undefined && o.dateOfDeath !== null && o.dateOfDeath !== '')
  @IsDateString()
  dateOfDeath?: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  janazahLocation: string;

  @IsDateString()
  prayerTime: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  burialLocation: string;

  @IsOptional() @IsString()
  verse?: string;

  @IsOptional() @IsString() @MaxLength(500)
  photoUrl?: string;
}
