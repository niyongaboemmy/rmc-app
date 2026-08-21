import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum JobApplicationStatusAction {
  START_REVIEW = 'start_review',
  SHORTLIST = 'shortlist',
  ACCEPT = 'accept',
  REJECT = 'reject',
  REQUEST_MORE_INFO = 'request_more_info',
}

export class UpdateJobApplicationStatusDto {
  @ApiProperty({ enum: JobApplicationStatusAction })
  @IsEnum(JobApplicationStatusAction)
  action: JobApplicationStatusAction;

  @ApiPropertyOptional({ description: 'Review notes (required when action is request_more_info)' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Rejection reason (required when action is reject)' })
  @IsOptional()
  @IsString()
  reason?: string;
}
