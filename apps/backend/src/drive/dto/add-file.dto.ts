import { IsString, IsOptional, IsUUID, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddFileDto {
  @ApiProperty({ example: 'report.pdf' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'drive/abc123.pdf' })
  @IsString()
  storageKey: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 204800 })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({ example: 'uuid-of-parent-folder' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
