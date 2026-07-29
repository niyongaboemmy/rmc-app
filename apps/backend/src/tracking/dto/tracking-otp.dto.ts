import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// The tracking code alone identifies the application; the phone to verify against
// is the one captured when the application was submitted (never re-typed here).
export class RequestTrackingOtpDto {
  @ApiProperty({ example: 'RMC-HAJ-2607-K7QX9M2T' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 40)
  trackingCode!: string;
}

export class VerifyTrackingOtpDto {
  @ApiProperty({ example: 'RMC-HAJ-2607-K7QX9M2T' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 40)
  trackingCode!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 8)
  otp!: string;
}
