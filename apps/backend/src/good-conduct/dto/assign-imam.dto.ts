import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignImamDto {
  @ApiPropertyOptional({ description: 'MosqueImam id to assign, if resolved' })
  @IsOptional()
  @IsUUID()
  mosqueImamId?: string;

  @ApiPropertyOptional({
    description: 'Free-text note when the imam could not be matched to an existing MosqueImam',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
