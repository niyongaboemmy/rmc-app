import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Admins name an *action*, not a target status — the service maps the action to
 * the resulting status and enforces which transitions are legal. A client can
 * never post an arbitrary status string.
 */
export enum TenderStatusAction {
  START_REVIEW = 'start_review',
  REQUEST_MORE_INFO = 'request_more_info',
  SHORTLIST = 'shortlist',
  AWARD = 'award',
  REJECT = 'reject',
}

export class UpdateTenderApplicationStatusDto {
  @ApiProperty({ enum: TenderStatusAction })
  @IsEnum(TenderStatusAction)
  action!: TenderStatusAction;

  /** Required for REQUEST_MORE_INFO — the service rejects a blank one. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;

  /** Required for REJECT — the service rejects a blank one. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  reason?: string;
}
