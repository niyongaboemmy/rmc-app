import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateJobPostingDto } from './create-job-posting.dto';
import { JobPostingStatus } from '../entities/job-posting.entity';

export class UpdateJobPostingDto extends PartialType(CreateJobPostingDto) {
  @IsOptional()
  @IsEnum(JobPostingStatus)
  status?: JobPostingStatus;
}
