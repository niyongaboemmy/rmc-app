import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SchoolLevel, SchoolStatus } from '../entities/school.entity';

/** Payload for creating/managing an Islamic school in the directory. */
export class CreateSchoolDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: SchoolLevel })
  @IsEnum(SchoolLevel)
  level: SchoolLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  principalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Human-readable location, e.g. "Nyarugenge, Kigali"' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  district?: string;

  @ApiPropertyOptional({ description: 'Province code: KIG, NOR, SOU, EAS, WES' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  provinceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  gpsLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  gpsLng?: number;

  @ApiPropertyOptional({ enum: SchoolStatus, default: SchoolStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SchoolStatus)
  status?: SchoolStatus;
}
