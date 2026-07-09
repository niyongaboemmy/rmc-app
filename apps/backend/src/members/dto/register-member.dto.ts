import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberCategory } from '../entities/member-profile.entity';

export class RegisterMemberDto {
  @ApiProperty({ description: 'Rwanda National ID — 16 digits' })
  @IsOptional()
  @IsString()
  @Length(16, 16, { message: 'National ID must be exactly 16 digits' })
  @Matches(/^\d{16}$/, { message: 'National ID must contain only digits' })
  nationalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  educationLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(MemberCategory)
  category?: MemberCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mosqueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;

  @ApiProperty()
  @IsBoolean()
  consentGiven: boolean;
}
