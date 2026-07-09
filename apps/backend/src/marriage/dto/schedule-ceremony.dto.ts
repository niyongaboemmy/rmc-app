import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleCeremonyDto {
  @ApiProperty()
  @IsDateString()
  ceremonyDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedImamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
