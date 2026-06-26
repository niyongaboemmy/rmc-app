import { IsString, IsOptional, IsNumber, IsPositive, IsBoolean, IsInt, Min } from 'class-validator';

export class UpsertPaymentTypeRateDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
