import {
  IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { HAJJ_CURRENCIES, type HajjCurrency } from '../entities/hajj-requirement.entity';

export class CreateHajjBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  accountName: string;

  /**
   * Digits, spaces and dashes only — account numbers are formatted differently
   * per bank, but letters are always a typo, and this string is rendered on a
   * public page for people to copy money into.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[0-9][0-9 -]*$/, {
    message: 'accountNumber must contain only digits, spaces or dashes',
  })
  accountNumber: string;

  @IsOptional()
  @IsIn(HAJJ_CURRENCIES)
  currency?: HajjCurrency;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  branch?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
