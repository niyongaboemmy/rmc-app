import {
  IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HAJJ_CURRENCIES, type HajjCurrency } from '../entities/hajj-requirement.entity';

export class CreateHajjRequirementDto {
  /** Stable slug — lowercase, no spaces. Cannot be changed once created. */
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, {
    message: 'key must be alphanumeric (dashes/underscores allowed) and start with a letter or digit',
  })
  @MaxLength(40)
  key: string;

  @IsString()
  @MaxLength(120)
  titleEn: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  titleRw?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  titleAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionRw?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  /** Omit (or null) for a requirement that costs nothing. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  amount?: number | null;

  /** Currency of `amount`. Defaults to RWF when omitted. */
  @IsOptional()
  @IsIn(HAJJ_CURRENCIES)
  currency?: HajjCurrency;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;
}
