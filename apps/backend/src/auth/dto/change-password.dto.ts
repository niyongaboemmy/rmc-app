import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from '../../common/utils/password.rule';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass@123' })
  @IsString()
  currentPassword: string;

  // Same rule as register and reset. This endpoint previously required only a
  // length of 8, so a strong password could be swapped for a trivial one the
  // moment the account existed.
  @ApiProperty({ example: 'NewPass@456', minLength: 8, maxLength: 50 })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;

  @ApiProperty({ example: 'NewPass@456', required: false })
  @IsOptional()
  @IsString()
  confirmPassword?: string;
}
