import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '../entities/donation-campaign.entity';

/** Admin creation of a donation program/campaign. */
export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'URL slug; auto-derived from the title when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

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

  @ApiPropertyOptional({
    description: 'Sub-fund this program belongs to (UUID); null for category-level programs',
  })
  @IsOptional()
  @IsUUID()
  subFundId?: string | null;

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

  @ApiPropertyOptional({ type: [String], description: 'Gallery image keys/URLs for the detail page' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryImages?: string[];

  @ApiPropertyOptional({ description: 'Show this campaign in the featured hero block' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Ordering weight for the grid (lower = earlier)' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Custom donate-button label', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaText?: string | null;

  @ApiPropertyOptional({ enum: CampaignStatus, default: CampaignStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
