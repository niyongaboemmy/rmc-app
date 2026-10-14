import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TestIremboPayInvoiceDto {
  @ApiPropertyOptional({ example: 100, description: 'Amount in `currency`. Defaults to 100.' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ example: 'DONATION', description: 'Payment type to invoice against' })
  @IsOptional()
  @IsString()
  paymentTypeKey?: string;

  @ApiPropertyOptional({ example: '0781234567' })
  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @ApiPropertyOptional({ example: 'RWF', enum: ['RWF', 'USD', 'EUR'], default: 'RWF' })
  @IsOptional()
  @IsIn(['RWF', 'USD', 'EUR'])
  currency?: 'RWF' | 'USD' | 'EUR';

  @ApiPropertyOptional({ example: 'EN', enum: ['EN', 'FR', 'RW'] })
  @IsOptional()
  @IsIn(['EN', 'FR', 'RW'])
  locale?: 'EN' | 'FR' | 'RW';
}

export class TestIremboPayPushDto extends TestIremboPayInvoiceDto {
  @ApiPropertyOptional({ example: 'MTN', enum: ['MTN', 'AIRTEL'] })
  @IsOptional()
  @IsIn(['MTN', 'AIRTEL'])
  paymentProvider?: 'MTN' | 'AIRTEL';
}
