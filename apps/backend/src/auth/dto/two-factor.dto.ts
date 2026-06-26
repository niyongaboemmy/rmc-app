import { IsString, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorVerifySetupDto {
  @ApiProperty({ example: '123456', description: '6-digit OTP sent to phone' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class TwoFactorDisableDto {
  @ApiProperty({ example: 'myPassword123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class TwoFactorVerifyLoginDto {
  @ApiProperty({ description: 'Temporary token received after credentials step' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP sent to phone' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class TwoFactorResendDto {
  @ApiProperty({ description: 'Temporary token received after credentials step' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;
}
