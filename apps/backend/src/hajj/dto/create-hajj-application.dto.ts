/**
 * Request body for `POST /hajj/apply`.
 *
 * The two payment proofs are REAL uploaded files: the browser first posts each
 * receipt to `POST /hajj/proofs`, which returns a file-server key, and those keys
 * are submitted here. The admin then opens the actual receipt, rather than reading
 * a filename the applicant typed.
 */
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HajjDocumentType } from '../entities/hajj-document.entity';

// Rwandan phone: local 07XXXXXXXX or international +250 / 250 7XXXXXXXX.
const RW_PHONE = /^(?:\+?250|0)7\d{8}$/;
const PASSPORT = /^[A-Za-z0-9]{5,15}$/;

export class HajjDocumentDto {
  @IsEnum(HajjDocumentType)
  documentType: HajjDocumentType;

  /** Key returned by POST /hajj/proofs — e.g. hajj-proofs/2b1f….pdf */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fileKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;
}

export class CreateHajjApplicationDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  fullName: string;

  @Matches(RW_PHONE, { message: 'phone must be a 10-digit Rwandan number' })
  phone: string;

  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail() @MaxLength(150)
  email?: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  district: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  sector: string;

  @Matches(PASSPORT, { message: 'passportNumber must be 5–15 alphanumeric characters' })
  passportNumber: string;

  /** Both receipts are required; the service checks each type appears exactly once. */
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => HajjDocumentDto)
  documents: HajjDocumentDto[];
}
