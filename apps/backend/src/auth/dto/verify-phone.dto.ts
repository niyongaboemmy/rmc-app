import { IsString, Matches, IsNumberString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneDto {
  @ApiProperty({ example: '+250781234567' })
  @IsString()
  @Matches(/^\+250[0-9]{9}$/, { message: 'Phone must be in Rwanda format: +250XXXXXXXXX' })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsNumberString()
  @Length(6, 6)
  otp: string;
}
