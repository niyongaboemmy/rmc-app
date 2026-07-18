import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, JobPostingStatus } from '../entities/job-posting.entity';

const blankToUndefined = Transform(({ value }) => (value === '' ? undefined : value));

export class CreateJobPostingDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 200) title!: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 150) department?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 150) location?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() districtId?: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(10, 10000) description!: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 10000) responsibilities?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 10000) requirements?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  numberOfPositions?: number;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 120) salaryRange?: string;

  @ApiPropertyOptional({ description: 'ISO date; applications are blocked after this.' })
  @blankToUndefined
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiPropertyOptional({ enum: [JobPostingStatus.DRAFT, JobPostingStatus.OPEN] })
  @IsOptional()
  @IsEnum(JobPostingStatus)
  status?: JobPostingStatus;
}
