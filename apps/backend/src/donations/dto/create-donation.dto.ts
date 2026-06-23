import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DonationFrequency } from '../entities/donation.entity';

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

  @ApiPropertyOptional({ default: 'RWF' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: DonationFrequency, default: DonationFrequency.ONCE })
  @IsOptional()
  @IsEnum(DonationFrequency)
  frequency?: DonationFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
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
