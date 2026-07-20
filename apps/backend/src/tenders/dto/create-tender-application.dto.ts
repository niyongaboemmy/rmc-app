import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsEnum,
  IsOptional,
  IsEmail,
  IsUUID,
  IsNumber,
  Min,
  ValidateNested,
  ArrayMaxSize,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenderDocumentType } from '../entities/tender-application-document.entity';

/** The frontend sends '' for untouched optional fields; class-validator would reject those. */
const blankToUndefined = Transform(({ value }) => (value === '' ? undefined : value));

export class TenderDocumentDto {
  @ApiProperty({ enum: TenderDocumentType })
  @IsEnum(TenderDocumentType)
  docType!: TenderDocumentType;

  /** File-server storage key returned by the upload endpoint — never a client-chosen path. */
  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 500) fileKey!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 255) fileName!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 100) mimeType!: string;

  @ApiProperty() @IsNumber() @Min(1) fileSize!: number;
}

export class CreateTenderApplicationDto {
  @ApiProperty({ description: 'The announcement id of the tender being bid on' })
  @IsUUID()
  tenderId!: string;

  // ── Company ────────────────────────────────────────────────────────────────
  @ApiProperty() @IsString() @IsNotEmpty() @Length(2, 200) companyName!: string;

  @ApiProperty({ example: '102345678', description: 'RRA TIN — 9 digits' })
  @Matches(/^[0-9]{9}$/, { message: 'TIN must be exactly 9 digits' })
  companyTin!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) contactName!: string;

  // ── Contact ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsEmail() email?: string;

  @ApiProperty({ example: '+250781234567', description: 'Rwanda phone format: +250XXXXXXXXX' })
  @Matches(/^\+250[0-9]{9}$/, { message: 'Phone must be in Rwanda format: +250XXXXXXXXX' })
  phone!: string;

  // ── Address ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() districtId?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() sectorId?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 100) cell?: string;
  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(1, 100)
  village?: string;

  // ── Bid ────────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Bid amount in RWF' })
  @blankToUndefined
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bidAmount?: number;

  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  coverNote?: string;

  // ── Documents ──────────────────────────────────────────────────────────────
  // Completeness (all three types present) is enforced in the service, not here —
  // an array-length rule can't express "one of each docType".
  @ApiProperty({ type: [TenderDocumentDto] })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => TenderDocumentDto)
  documents!: TenderDocumentDto[];
}
