import { Type } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf, ValidateNested,
  Max, MaxLength, Matches, Min,
} from 'class-validator';

// Rwandan phone: local 07XXXXXXXX or international +250 / 250 7XXXXXXXX.
// National ID: 16 digits.
const RW_PHONE = /^(?:\+?250|0)7\d{8}$/;
const NATIONAL_ID = /^\d{16}$/;

class DeceasedInfoDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName: string;

  @IsIn(['male', 'female'])
  gender: 'male' | 'female';

  @IsOptional() @IsString()
  dateOfBirth?: string;

  @IsString() @IsNotEmpty()
  dateOfDeath: string;

  @IsOptional() @IsString() @Matches(NATIONAL_ID, { message: 'nationalId must be 16 digits' })
  nationalId?: string;

  @IsOptional() @IsString() @MaxLength(200)
  placeOfDeath?: string;

  @IsOptional() @IsString()
  causeOfDeath?: string;

  /**
   * File-server key of the uploaded death certificate, from POST /funeral/documents.
   * Optional — a death can be reported before the certificate is in hand.
   */
  @IsOptional() @IsString() @MaxLength(500)
  deathCertificate?: string;

  @IsOptional() @IsString() @MaxLength(255)
  deathCertificateName?: string;

  @IsOptional() @IsString() @MaxLength(100)
  deathCertificateMime?: string;

  @IsOptional() @IsInt() @Min(1) @Max(10 * 1024 * 1024)
  deathCertificateSize?: number;
}

class FamilyInfoDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  nextOfKin: string;

  @IsString() @IsNotEmpty() @Matches(RW_PHONE, { message: 'phone must be a 10-digit Rwandan number' })
  phone: string;

  // Skip email-format validation when the field is blank (form sends '').
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail() @MaxLength(150)
  email?: string;

  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @IsOptional() @ValidateIf((o) => o.emergencyContact !== undefined && o.emergencyContact !== null && o.emergencyContact !== '')
  @IsString() @Matches(RW_PHONE, { message: 'emergencyContact must be a 10-digit Rwandan number' })
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
  transportationRequired?: boolean;

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
