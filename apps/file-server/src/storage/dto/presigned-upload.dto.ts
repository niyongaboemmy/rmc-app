import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresignedUploadDto {
  @ApiProperty({ description: 'Original filename with extension', example: 'photo.jpg' })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({ description: 'MIME type of the file', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiPropertyOptional({ description: 'Target folder/prefix', example: 'documents' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_\-/]+$/)
  folder?: string;

  @ApiPropertyOptional({ description: 'URL expiry in seconds (60–86400)', example: 3600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresIn?: number;
}
