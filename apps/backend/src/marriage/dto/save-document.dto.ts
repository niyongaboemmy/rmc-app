import { IsEnum, IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../entities/marriage-document.entity';

export class SaveDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

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
