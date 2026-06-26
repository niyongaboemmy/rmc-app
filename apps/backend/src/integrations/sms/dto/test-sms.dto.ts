import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestSmsDto {
  @ApiProperty({ description: 'Recipient phone number (Rwanda format)', example: '0788123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: 'Message body to send', example: 'Test message from RMC admin.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(160)
  message: string;
}
