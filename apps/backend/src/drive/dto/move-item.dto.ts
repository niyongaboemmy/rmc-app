import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MoveItemDto {
  @ApiPropertyOptional({ description: 'Target folder ID (null = root)', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  targetFolderId?: string | null;
}
