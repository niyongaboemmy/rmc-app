import { IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/** Admin creation of a campaign news/progress update. */
export class CreateCampaignUpdateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Update body (may contain rich HTML)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Publish date (defaults to now)' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

/** Admin update of a campaign news/progress update. All fields optional. */
export class UpdateCampaignUpdateDto extends PartialType(CreateCampaignUpdateDto) {}
