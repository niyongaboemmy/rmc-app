import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsUUID,
  IsIn,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMosqueDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentMosqueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

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
  @IsNumber()
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  foundingYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'HH:MM format' })
  @IsOptional()
  @IsString()
  fridayPrayerTime?: string;

  @ApiPropertyOptional({ description: 'Name of the mosque imam' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  imamName?: string;

  @ApiPropertyOptional({ description: "Imam's phone number" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  imamPhone?: string;

  @ApiPropertyOptional({ description: 'URL of the mosque imam photo' })
  @IsOptional()
  @IsString()
  imamPhoto?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
