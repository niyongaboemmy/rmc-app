import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '../entities/donation-campaign.entity';

/** Admin creation of a donation program/campaign. */
export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  targetAmount: number;

  @ApiPropertyOptional({ default: 'RWF' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ default: 'general' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  fundType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImageUrl?: string | null;

  @ApiPropertyOptional({ enum: CampaignStatus, default: CampaignStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
