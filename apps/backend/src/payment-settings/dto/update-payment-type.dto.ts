import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class UpdatePaymentTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;
}
