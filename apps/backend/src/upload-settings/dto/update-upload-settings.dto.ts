import { IsInt, Min, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUploadSettingsDto {
  @ApiPropertyOptional({
    description: 'Max file size in bytes (0 = unlimited)',
    example: 524288000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxFileSize?: number;
}
