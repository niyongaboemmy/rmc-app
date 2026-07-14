import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf, IsNotEmpty } from 'class-validator';
import { HajjApplicationStatus } from '../entities/hajj-application.entity';

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
}
