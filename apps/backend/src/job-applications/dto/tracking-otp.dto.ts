import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Accept 07XXXXXXXX, +2507XXXXXXXX or 2507XXXXXXXX — normalized server-side.
const PHONE_RE = /^(?:\+?250|0)7[0-9]{8}$/;

export class RequestTrackingOtpDto {
  @ApiProperty({ example: 'RMC-JOB-2607-K7QX9M2T' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 40)
  trackingCode!: string;

  @ApiProperty({ example: '0781234567' })
  @Matches(PHONE_RE, { message: 'Enter a valid Rwandan phone number' })
  phone!: string;
}

export class VerifyTrackingOtpDto {
  @ApiProperty({ example: 'RMC-JOB-2607-K7QX9M2T' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 40)
  trackingCode!: string;

  @ApiProperty({ example: '0781234567' })
  @Matches(PHONE_RE, { message: 'Enter a valid Rwandan phone number' })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 8)
  otp!: string;
}
