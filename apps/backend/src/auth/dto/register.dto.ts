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
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from '../../common/utils/password.rule';

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
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
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

  /**
   * The `''`→`undefined` transforms are load-bearing, not tidying.
   *
   * `@IsOptional()` skips validation for `undefined` and `null` and nothing else,
   * but an untouched `<select>` or `<input type="date">` submits `''`. Without
   * this, leaving the optional gender dropdown alone — which the form invites,
   * since it opens on a placeholder — failed registration outright with
   * "gender must be one of the following values: male, female".
   */
  @ApiPropertyOptional({ example: '1990-01-15' })
  @Transform(({ value }: { value: string }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @Transform(({ value }: { value: string }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: string;
}
