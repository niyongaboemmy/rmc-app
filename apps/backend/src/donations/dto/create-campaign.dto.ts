import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsDateString,
  IsUUID,
  Matches,
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
  @MaxLength(20000)
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

  @ApiPropertyOptional({ description: 'Full URL, absolute path, or file-server key (no whitespace)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  // Accepts a full URL, a "/absolute" path, or a relative file-server key,
  // but rejects obviously-invalid values (spaces / angle brackets).
  @Matches(/^[^\s<>]+$/, { message: 'heroImageUrl must be a URL or file path with no spaces' })
  heroImageUrl?: string | null;

  @ApiPropertyOptional({ enum: CampaignStatus, default: CampaignStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
