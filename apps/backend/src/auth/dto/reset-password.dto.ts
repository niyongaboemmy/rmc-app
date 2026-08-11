import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from '../../common/utils/password.rule';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Raw UUID token from the reset email link' })
  @IsString()
  token: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 50,
    description: 'Must contain uppercase, lowercase, number, and special character',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
