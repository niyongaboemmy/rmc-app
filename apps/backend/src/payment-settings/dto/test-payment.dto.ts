import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestPaymentDto {
  @ApiProperty({ example: '250788000000', description: 'Mobile phone number to charge' })
  @IsString()
  @IsNotEmpty()
  mobilePhone: string;

  @ApiProperty({ example: 100, description: 'Amount in RWF' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    example: 'MARRIAGE_FEE',
    description: 'Payment type key for categorisation',
  })
  @IsOptional()
  @IsString()
  paymentTypeKey?: string;

  @ApiPropertyOptional({ example: 'RWF' })
  @IsOptional()
  @IsString()
  currency?: string;
}
