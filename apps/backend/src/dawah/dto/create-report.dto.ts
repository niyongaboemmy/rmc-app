import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { REPORT_REASONS } from '../discussions.constants';

/** Report a question or answer. One per person per item (the DB enforces it). */
export class CreateReportDto {
  @ApiProperty({ enum: ['question', 'answer'] })
  @IsIn(['question', 'answer'])
  targetType: 'question' | 'answer';

  @ApiProperty()
  @IsUUID()
  targetId: string;

  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn(REPORT_REASONS)
  reason: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
