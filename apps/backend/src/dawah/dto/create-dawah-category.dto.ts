import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Payload for a Dawah category — the taxonomy shared by courses and the library. */
export class CreateDawahCategoryDto {
  @ApiPropertyOptional({
    description: 'Derived from nameEn when omitted. Lowercase, hyphenated.',
    example: 'quran-studies',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  @MaxLength(80)
  slug?: string;

  @ApiProperty({ example: 'Qur’an Studies' })
  @IsString()
  @MaxLength(120)
  nameEn: string;

  @ApiPropertyOptional({ description: 'Falls back to English in the UI when empty.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameRw?: string;

  @ApiPropertyOptional({ description: 'Falls back to English in the UI when empty.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'lucide-react icon name.', example: 'BookOpen' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiPropertyOptional({ description: 'Appended to the end of the list when omitted.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
