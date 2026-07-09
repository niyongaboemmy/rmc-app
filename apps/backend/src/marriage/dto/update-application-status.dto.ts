import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarriageApplicationStatus } from '../entities/marriage-application.entity';

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: MarriageApplicationStatus })
  @IsEnum(MarriageApplicationStatus)
  status: MarriageApplicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amendmentsRequestedText?: string;
}
