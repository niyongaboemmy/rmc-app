import { IsString, IsNumberString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaVerifySetupDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code from authenticator app' })
  @IsNumberString()
  @Length(6, 6)
  totp: string;
}

export class MfaDisableDto {
  @ApiProperty({ description: 'Current account password for confirmation' })
  @IsString()
  password: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code from authenticator app' })
  @IsNumberString()
  @Length(6, 6)
  totp: string;
}
