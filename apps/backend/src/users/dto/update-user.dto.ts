import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsUUID,
  IsEmail,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
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
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+2507[2389]\d{7}$/)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: string;

  @ApiPropertyOptional({ enum: ['active', 'pending', 'suspended', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'pending', 'suspended', 'inactive'])
  status?: string;

  @ApiPropertyOptional({ description: 'Profile photo URL from file server' })
  @IsOptional()
  @IsUrl({}, { message: 'profilePhotoUrl must be a valid URL' })
  @MaxLength(500)
  profilePhotoUrl?: string;
}

export class AssignRoleDto {
  @ApiPropertyOptional({ description: 'Role ID (null to unassign)' })
  @IsOptional()
  @IsUUID()
  roleId?: string | null;

  @ApiPropertyOptional({ enum: ['user', 'operator', 'admin', 'superadmin'] })
  @IsOptional()
  @IsIn(['user', 'operator', 'admin', 'superadmin'])
  role?: string;
}
