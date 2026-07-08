import { Type } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf, ValidateNested, MaxLength,
} from 'class-validator';

class DeceasedInfoDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName: string;

  @IsIn(['male', 'female'])
  gender: 'male' | 'female';

  @IsOptional() @IsString()
  dateOfBirth?: string;

  @IsString() @IsNotEmpty()
  dateOfDeath: string;

  @IsOptional() @IsString() @MaxLength(20)
  nationalId?: string;

  @IsOptional() @IsString() @MaxLength(200)
  placeOfDeath?: string;

  @IsOptional() @IsString()
  causeOfDeath?: string;

  @IsOptional() @IsString() @MaxLength(500)
  deathCertificate?: string;
}

class FamilyInfoDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  nextOfKin: string;

  @IsString() @IsNotEmpty() @MaxLength(30)
  phone: string;

  // Skip email-format validation when the field is blank (form sends '').
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail() @MaxLength(150)
  email?: string;

  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @IsOptional() @IsString() @MaxLength(30)
  emergencyContact?: string;
}

class ArrangementsDto {
  @IsOptional() @IsString() @MaxLength(200)
  preferredMosque?: string;

  @IsOptional() @IsString() @MaxLength(200)
  preferredCemetery?: string;

  @IsOptional() @IsString()
  preferredBurialDate?: string;

  @IsOptional() @IsString() @MaxLength(10)
  preferredBurialTime?: string;

  @IsOptional() @IsBoolean()
  ghuslRequired?: boolean;

  @IsOptional() @IsBoolean()
  kafanRequired?: boolean;

  @IsOptional() @IsBoolean()
  janazahPrayerRequired?: boolean;

  @IsOptional() @IsBoolean()
  transportationRequired?: boolean;

  @IsOptional() @IsBoolean()
  gravePreparationRequired?: boolean;

  @IsOptional() @IsString()
  notes?: string;
}

export class CreateFuneralRequestDto {
  @ValidateNested() @Type(() => DeceasedInfoDto)
  deceased: DeceasedInfoDto;

  @ValidateNested() @Type(() => FamilyInfoDto)
  family: FamilyInfoDto;

  @ValidateNested() @Type(() => ArrangementsDto)
  arrangements: ArrangementsDto;
}
