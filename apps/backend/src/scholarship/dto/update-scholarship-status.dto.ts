import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScholarshipStatusAction {
  START_REVIEW = 'start_review',
  APPROVE = 'approve',
  REJECT = 'reject',
  CONFIRM = 'confirm',
}

export class UpdateScholarshipStatusDto {
  @ApiProperty({ enum: ScholarshipStatusAction })
  @IsEnum(ScholarshipStatusAction)
  action: ScholarshipStatusAction;

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Rejection reason (required when action is reject)' })
  @IsOptional()
  @IsString()
  reason?: string;
}
