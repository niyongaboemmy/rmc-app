import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HajjDocumentType } from '../entities/hajj-document.entity';

/**
 * One document in an applicant's re-upload after "more information requested".
 *
 * The bytes are already on the file server (POST /hajj/proofs returns the key);
 * this only attaches that key to the application. The metadata mirrors what the
 * original submission stores so the admin UI can render the new file inline
 * exactly like the first one.
 */
export class ResubmitHajjDocumentItemDto {
  @IsEnum(HajjDocumentType)
  documentType: HajjDocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fileKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  /** Matches the 10 MB ceiling enforced by the upload endpoint. */
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;
}

/**
 * The applicant's answer to a "more information requested".
 *
 * A batch on purpose: an admin can ask for more than one receipt in a single
 * request, and the applicant must be able to supply them together — the
 * application only returns to review once, after all of them are attached, so a
 * two-document ask can't lock the applicant out after the first upload. There
 * are exactly two Hajj document types, hence the 1–2 bound.
 */
export class ResubmitHajjDocumentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => ResubmitHajjDocumentItemDto)
  documents: ResubmitHajjDocumentItemDto[];
}
