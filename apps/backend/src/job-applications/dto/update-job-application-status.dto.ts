import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { REQUESTABLE_JOB_DOCUMENTS } from '../requestable-documents';
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

  /**
   * Which documents the applicant must supply, for `request_more_info`.
   *
   * Validated against the known slots rather than accepted as free text: the applicant's
   * form renders an upload control per entry, so an unrecognised key would be a request
   * they had no way to answer.
   */
  @ApiPropertyOptional({ enum: REQUESTABLE_JOB_DOCUMENTS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(REQUESTABLE_JOB_DOCUMENTS.length)
  @IsIn(REQUESTABLE_JOB_DOCUMENTS as unknown as string[], { each: true })
  documents?: string[];
}
