import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({ example: 'Documents' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'uuid-of-parent-folder' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: '#4285F4' })
  @IsOptional()
  @IsString()
  color?: string;
}
