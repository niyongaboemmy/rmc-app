import { IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export interface TriText {
  en?: string;
  rw?: string;
  ar?: string;
}
export interface TriList {
  en?: string[];
  rw?: string[];
  ar?: string[];
}

export class CreateCategoryDto {
  @ApiProperty({ description: 'Stable slug (lowercase, used in donation metadata)' })
  @IsString()
  @MaxLength(40)
  key: string;

  @ApiPropertyOptional({ description: 'lucide-react icon name' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiPropertyOptional({ enum: ['green', 'gold'] })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  tone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @ApiPropertyOptional({ description: '{ en, rw, ar }' })
  @IsOptional()
  @IsObject()
  title?: TriText;
  @IsOptional() @IsObject() desc?: TriText;
  @IsOptional() @IsObject() long?: TriText;
  @IsOptional() @IsObject() impact?: TriText;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CreateSubFundDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @ApiPropertyOptional({ description: 'Optional live-campaign slug for the progress bar' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  campaignSlug?: string | null;

  @IsOptional() @IsObject() label?: TriText;
  @IsOptional() @IsObject() long?: TriText;
  @IsOptional() @IsObject() impact?: TriText;
  @IsOptional() @IsObject() examples?: TriList;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class UpdateSubFundDto extends PartialType(CreateSubFundDto) {}
