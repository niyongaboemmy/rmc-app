import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestDepositDto {
  @ApiProperty({ example: '250788000000', description: 'Mobile phone number to send money to' })
  @IsString()
  @IsNotEmpty()
  mobilePhone: string;

  @ApiProperty({ example: 100, description: 'Amount in RWF' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'RMC test deposit', description: 'Reason shown to the recipient' })
  @IsOptional()
  @IsString()
  reason?: string;
}
