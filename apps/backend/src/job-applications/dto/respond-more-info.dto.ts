import { IsString, IsNotEmpty, Length, IsOptional, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobDocumentDto } from './create-job-application.dto';
import { REQUESTABLE_JOB_DOCUMENTS } from '../requestable-documents';

/**
 * One file in a reply, tagged with the request it answers.
 *
 * `slot` is what makes the reply legible: without it every upload landed in one
 * undifferentiated pile and a reviewer who asked for two documents could not tell which
 * of them a file was. Optional, because an applicant may also attach something nobody
 * asked for.
 */
export class RespondDocumentDto extends JobDocumentDto {
  @ApiPropertyOptional({ enum: REQUESTABLE_JOB_DOCUMENTS, description: 'Which requested document this answers' })
  @IsOptional()
  @IsIn(REQUESTABLE_JOB_DOCUMENTS as unknown as string[])
  slot?: string;
}

export class RespondMoreInfoDto {
  @ApiProperty({ description: "The applicant's reply to the reviewer's request" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  message!: string;

  @ApiPropertyOptional({
    type: [RespondDocumentDto],
    description: 'Documents attached to the reply',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RespondDocumentDto)
  documents?: RespondDocumentDto[];
}
