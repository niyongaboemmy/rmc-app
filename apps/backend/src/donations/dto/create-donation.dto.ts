import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DonationFrequency } from '../entities/donation.entity';
import { ACCEPTED_DONATION_METHODS } from '../donation-payment-method';
import { DONATION_CURRENCIES } from '../donation-payment-type';

/** Payload sent by the public donate page when a visitor makes a donation. */
export class CreateDonationDto {
  @ApiPropertyOptional({
    description: 'Slug of the campaign/program, or null for the general fund',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  campaignSlug?: string | null;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    enum: DONATION_CURRENCIES,
    default: 'RWF',
    description: 'A currency RMC holds an IremboPay account in. Case-insensitive.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(DONATION_CURRENCIES as readonly string[])
  currency?: string;

  @ApiPropertyOptional({ enum: DonationFrequency, default: DonationFrequency.ONCE })
  @IsOptional()
  @IsEnum(DonationFrequency)
  frequency?: DonationFrequency;

  @ApiPropertyOptional({
    enum: ACCEPTED_DONATION_METHODS,
    description:
      "How the donation is paid. Online methods ('momo', 'card') are collected by the " +
      'payment gateway and start as pending; the rest are recorded as already received. ' +
      'Case-insensitive. An unrecognised value is rejected rather than assumed paid.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(ACCEPTED_DONATION_METHODS as readonly string[])
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  donorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  donorEmail?: string;

  @ApiPropertyOptional({ description: 'Payer mobile number (required for Mobile Money)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  donorPhone?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
