import { PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';

/** Admin update of a donation program/campaign. All fields optional. */
export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @ApiPropertyOptional({ description: 'Manually override the displayed raised amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  raisedAmount?: number;
}
