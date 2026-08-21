import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertProviderProductDto {
  @ApiProperty({ description: 'Payment type to map' })
  @IsUUID()
  paymentTypeId: string;

  @ApiPropertyOptional({
    description: 'Specific rate to map. Omit to set the payment type default mapping.',
  })
  @IsOptional()
  @IsUUID()
  paymentTypeRateId?: string;

  @ApiProperty({ example: 'PI-3e5fe23f2d', description: "The provider's product code" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  productCode: string;

  @ApiPropertyOptional({
    example: 'TST-RWF',
    description: 'Overrides the method-level payment account — e.g. to bill this type in USD.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentAccountIdentifier?: string;
}
