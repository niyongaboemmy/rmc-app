import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsEnum,
  IsOptional,
  IsEmail,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScholarshipLevel } from '../entities/scholarship-program.entity';
import {
  ScholarshipGender,
  ScholarshipRelationship,
} from '../entities/scholarship-application.entity';

const blankToUndefined = Transform(({ value }) => (value === '' ? undefined : value));

export class CreateScholarshipApplicationDto {
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() programId?: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) fullNames!: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsDateString() dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ScholarshipGender })
  @blankToUndefined
  @IsOptional()
  @IsEnum(ScholarshipGender)
  gender?: ScholarshipGender;

  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(1, 30)
  nationalId?: string;

  @ApiProperty({ example: '+250781234567', description: 'Rwanda phone format: +250XXXXXXXXX' })
  @Matches(/^\+250[0-9]{9}$/, { message: 'Phone must be in Rwanda format: +250XXXXXXXXX' })
  phone!: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsEmail() email?: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() districtId?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() sectorId?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 100) cell?: string;
  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(1, 100)
  village?: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 200) schoolName!: string;

  @ApiProperty({ enum: ScholarshipLevel })
  @IsEnum(ScholarshipLevel)
  educationLevel!: ScholarshipLevel;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 50) currentYear!: string;

  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(1, 20)
  averageGrade?: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) guardianName!: string;

  @ApiProperty({ example: '+250781234567', description: 'Rwanda phone format: +250XXXXXXXXX' })
  @Matches(/^\+250[0-9]{9}$/, { message: 'Guardian phone must be in Rwanda format: +250XXXXXXXXX' })
  guardianPhone!: string;

  @ApiProperty({ enum: ScholarshipRelationship })
  @IsEnum(ScholarshipRelationship)
  relationship!: ScholarshipRelationship;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(10, 1000) motivation!: string;
}
