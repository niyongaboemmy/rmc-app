import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
  IsEmail,
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const blankToUndefined = Transform(({ value }) => (value === '' ? undefined : value));

export class JobDocumentDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 500) key!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @Length(1, 300) name!: string;
}

export class JobApplicationDocumentsDto {
  @ApiProperty({ type: JobDocumentDto })
  @ValidateNested()
  @Type(() => JobDocumentDto)
  applicationLetter!: JobDocumentDto;

  @ApiProperty({ type: JobDocumentDto })
  @ValidateNested()
  @Type(() => JobDocumentDto)
  cv!: JobDocumentDto;

  @ApiProperty({ type: JobDocumentDto })
  @ValidateNested()
  @Type(() => JobDocumentDto)
  nationalId!: JobDocumentDto;

  @ApiProperty({ type: JobDocumentDto })
  @ValidateNested()
  @Type(() => JobDocumentDto)
  criminalRecord!: JobDocumentDto;

  @ApiProperty({ type: [JobDocumentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => JobDocumentDto)
  academicPapers!: JobDocumentDto[];

  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(1, 40)
  goodConductCertificateNumber?: string;

  @ApiPropertyOptional({ type: JobDocumentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JobDocumentDto)
  goodConductCertificate?: JobDocumentDto;

  @ApiPropertyOptional({ type: JobDocumentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JobDocumentDto)
  employerRecommendation?: JobDocumentDto;
}

export class CreateJobApplicationDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) fullNames!: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsEmail() email?: string;

  @ApiProperty({ example: '+250781234567', description: 'Rwanda phone format: +250XXXXXXXXX' })
  @Matches(/^\+250[0-9]{9}$/, { message: 'Phone must be in Rwanda format: +250XXXXXXXXX' })
  phone!: string;

  // The admin-posted vacancy being applied to. When provided, the server sets
  // positionAppliedFor from the posting title. positionAppliedFor is only
  // required when no jobPostingId is given (legacy/free-text path).
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() jobPostingId?: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(2, 150) positionAppliedFor?: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() districtId?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() sectorId?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 100) cell?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 100) village?: string;

  @ApiProperty({ type: JobApplicationDocumentsDto })
  @ValidateNested()
  @Type(() => JobApplicationDocumentsDto)
  documents!: JobApplicationDocumentsDto;
}
