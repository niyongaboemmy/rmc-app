import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
  Matches,
  IsDateString,
  IsIn,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@rmc.org.rw' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+250788000001' })
  @IsString()
  @Matches(/^\+2507[2389]\d{7}$/, {
    message: 'Phone must be a valid Rwanda number (+250XXXXXXXXX)',
  })
  phone: string;

  @ApiProperty({ example: 'SecurePass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: string;

  @ApiPropertyOptional({ description: 'Role ID to assign' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ enum: ['user', 'operator', 'admin', 'superadmin'], default: 'user' })
  @IsOptional()
  @IsIn(['user', 'operator', 'admin', 'superadmin'])
  role?: string;
}
