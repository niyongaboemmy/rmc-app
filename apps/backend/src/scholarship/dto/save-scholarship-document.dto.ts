import { IsEnum, IsString, IsNumber, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScholarshipDocumentType } from '../entities/scholarship-document.entity';

export class SaveScholarshipDocumentDto {
  @ApiProperty({ enum: ScholarshipDocumentType })
  @IsEnum(ScholarshipDocumentType)
  documentType: ScholarshipDocumentType;

  /**
   * Which declared requirement this file answers (the `key` from the
   * scholarship's `requiredDocuments`). Optional: generic uploads, and
   * scholarships that declare no requirements, simply omit it.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 40)
  requirementKey?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty()
  @IsNumber()
  fileSize: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
