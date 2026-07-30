import { IsArray, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenderDocumentType } from '../entities/tender-application-document.entity';
import { TenderMoreInfoField } from '../more-info-targets';

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

  /**
   * REQUEST_MORE_INFO only — which field groups the bidder may correct. Together
   * with `moreInfoDocumentTypes` this scopes the re-submission; the service
   * refuses a request that names neither, since an ask the bidder cannot act on
   * is just a status change.
   */
  @ApiPropertyOptional({ enum: TenderMoreInfoField, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TenderMoreInfoField, { each: true })
  moreInfoFields?: TenderMoreInfoField[];

  /** REQUEST_MORE_INFO only — which attachments the bidder may replace. */
  @ApiPropertyOptional({ enum: TenderDocumentType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TenderDocumentType, { each: true })
  moreInfoDocumentTypes?: TenderDocumentType[];
}
