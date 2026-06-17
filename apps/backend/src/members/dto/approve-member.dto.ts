import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ApproveMemberDto {
  @ApiProperty({ enum: ApprovalAction })
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @ApiPropertyOptional({ description: 'Required when rejecting' })
  @IsOptional()
  @IsString()
  reason?: string;
}
