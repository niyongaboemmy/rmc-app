import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { HajjApplicationStatus } from '../entities/hajj-application.entity';

export class QueryHajjApplicationsDto {
  @IsOptional()
  @IsEnum(HajjApplicationStatus)
  status?: HajjApplicationStatus;

  /** Matches application number, full name, phone or passport number. */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
