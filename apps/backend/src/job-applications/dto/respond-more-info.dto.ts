import { IsString, IsNotEmpty, Length, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobDocumentDto } from './create-job-application.dto';

export class RespondMoreInfoDto {
  @ApiProperty({ description: 'The applicant\'s reply to the reviewer\'s request' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  message!: string;

  @ApiPropertyOptional({ type: [JobDocumentDto], description: 'Any extra documents the applicant attaches' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobDocumentDto)
  documents?: JobDocumentDto[];
}
