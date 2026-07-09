import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ManualPaymentMethod {
  BANK = 'bank',
  CASH = 'cash',
}

export class ConfirmPaymentDto {
  @ApiProperty({ enum: ManualPaymentMethod })
  @IsEnum(ManualPaymentMethod)
  method: ManualPaymentMethod;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
