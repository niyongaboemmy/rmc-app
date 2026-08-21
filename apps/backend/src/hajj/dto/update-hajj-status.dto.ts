import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
import { HajjApplicationStatus } from '../entities/hajj-application.entity';
import { HajjDocumentType } from '../entities/hajj-document.entity';

export class UpdateHajjStatusDto {
  @IsEnum(HajjApplicationStatus)
  status: HajjApplicationStatus;

  /** Internal note for the audit trail — never shown to the applicant. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /**
   * Required when rejecting: it is sent to the applicant verbatim (SMS + email),
   * so a rejection can never reach them without an explanation.
   */
  @ValidateIf((o) => o.status === HajjApplicationStatus.REJECTED)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is required when rejecting an application' })
  @MaxLength(1000)
  rejectionReason?: string;

  /**
   * Required when asking for more information: it is sent to the applicant
   * verbatim (SMS + email) and shown on their tracking page, so they are never
   * told "something is missing" without being told WHAT.
   */
  @ValidateIf((o) => o.status === HajjApplicationStatus.MORE_INFO_REQUESTED)
  @IsString()
  @IsNotEmpty({
    message: 'moreInfoRequested is required when requesting more information',
  })
  @MaxLength(1000)
  moreInfoRequested?: string;

  /**
   * Which receipt(s) the applicant must (re)upload. Required when requesting more
   * information: it decides which upload slots the tracking page shows and bounds
   * what the applicant is allowed to replace.
   */
  @ValidateIf((o) => o.status === HajjApplicationStatus.MORE_INFO_REQUESTED)
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Choose at least one document when requesting more information',
  })
  @ArrayUnique()
  @IsEnum(HajjDocumentType, { each: true })
  moreInfoDocumentTypes?: HajjDocumentType[];
}
