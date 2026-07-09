import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsUrl,
  IsEmail,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+250788000001', description: 'Rwanda phone: +250... or 07...' })
  @IsOptional()
  @Matches(/^(\+2507[2389]\d{7}|07[2389]\d{7})$/, {
    message: 'Phone must be a valid Rwanda number (07XXXXXXXX or +250XXXXXXXXX)',
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'URL of profile photo stored on file server' })
  @IsOptional()
  @IsUrl({}, { message: 'profilePhotoUrl must be a valid URL' })
  @MaxLength(500)
  profilePhotoUrl?: string;
}
