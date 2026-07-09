import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsEnum,
  IsOptional,
  IsEmail,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoodConductMotif } from '../entities/good-conduct-request.entity';

const blankToUndefined = Transform(({ value }) => (value === '' ? undefined : value));

export class CreateGoodConductRequestDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) fullNames!: string;

  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(3, 150)
  fatherName?: string;
  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(3, 150)
  motherName?: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() districtId?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() sectorId?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsString() @Length(1, 100) cell?: string;
  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(1, 100)
  village?: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsEmail() email?: string;

  @ApiProperty({ example: '+250781234567', description: 'Rwanda phone format: +250XXXXXXXXX' })
  @Matches(/^\+250[0-9]{9}$/, { message: 'Phone must be in Rwanda format: +250XXXXXXXXX' })
  phone!: string;

  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsUUID() mosqueId?: string;
  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(1, 150)
  requestedImamName?: string;

  @ApiProperty({ enum: GoodConductMotif }) @IsEnum(GoodConductMotif) motif!: GoodConductMotif;

  @ApiPropertyOptional()
  @ValidateIf((dto) => dto.motif === GoodConductMotif.OTHER)
  @IsNotEmpty({ message: 'motifDetail is required when motif is "other"' })
  @IsString()
  @Length(0, 500)
  motifDetail?: string;
}
