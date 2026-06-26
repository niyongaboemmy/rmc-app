import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertPaymentMethodSettingsDto {
  @ApiProperty({ description: 'Key-value map of credentials/config for this payment method' })
  @IsObject()
  settings: Record<string, string>;

  @ApiPropertyOptional({ description: 'When true, payments use the test/sandbox endpoint' })
  @IsOptional()
  @IsBoolean()
  isTestMode?: boolean;
}
