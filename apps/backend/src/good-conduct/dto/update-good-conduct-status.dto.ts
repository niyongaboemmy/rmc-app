import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GoodConductStatusAction {
  START_REVIEW = 'start_review',
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_MORE_INFO = 'request_more_info',
}

export class UpdateGoodConductStatusDto {
  @ApiProperty({ enum: GoodConductStatusAction })
  @IsEnum(GoodConductStatusAction)
  action: GoodConductStatusAction;

  @ApiPropertyOptional({ description: 'Review notes (required when action is request_more_info)' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Rejection reason (required when action is reject)' })
  @IsOptional()
  @IsString()
  reason?: string;
}
