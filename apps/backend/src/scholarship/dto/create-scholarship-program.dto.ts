import {
  IsString,
  IsNotEmpty,
  Length,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScholarshipLevel } from '../entities/scholarship-program.entity';

const blankToUndefined = Transform(({ value }) => (value === '' ? undefined : value));

export class CreateScholarshipProgramDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 200) title!: string;

  @ApiProperty() @IsString() @IsNotEmpty() description!: string;

  @ApiPropertyOptional({ enum: ScholarshipLevel })
  @blankToUndefined
  @IsOptional()
  @IsEnum(ScholarshipLevel)
  level?: ScholarshipLevel;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsNumber() @Min(0) amount?: number;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsDateString() deadline?: string;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isOpen?: boolean;
}
