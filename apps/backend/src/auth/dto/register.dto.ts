import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsDateString,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ahmed.hassan@example.com' })
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  email: string;

  @ApiProperty({ example: '+250781234567', description: 'Rwanda phone format: +250XXXXXXXXX' })
  @IsString()
  @Matches(/^\+250[0-9]{9}$/, { message: 'Phone must be in Rwanda format: +250XXXXXXXXX' })
  phone: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 50,
    description: 'Must contain uppercase, lowercase, number, and special character',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#])[A-Za-z\d@$!%*?&\-_#]{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Hassan' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
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
}
