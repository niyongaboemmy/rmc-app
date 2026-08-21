import { IsEnum, IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ScholarshipDocumentType } from '../entities/scholarship-document.entity';

export class SaveScholarshipDocumentDto {
  @ApiProperty({ enum: ScholarshipDocumentType })
  @IsEnum(ScholarshipDocumentType)
  documentType: ScholarshipDocumentType;

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
