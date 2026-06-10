import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '../entities/member-profile.entity';

export class UpdateMemberStatusDto {
  @ApiProperty({ enum: MemberStatus })
  @IsEnum(MemberStatus)
  status: MemberStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
