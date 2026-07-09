import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VenueType } from '../entities/marriage-application.entity';

const nid = Matches(/^\d{16}$/, { message: 'Must be exactly 16 digits' });
const blankToUndefined = Transform(({ value }) => (value === '' ? undefined : value));

export class CreateMarriageApplicationDto {
  @ApiProperty() @IsString() @IsNotEmpty() notificationPhone!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) groomName!: string;
  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(3, 150)
  groomFatherName?: string;
  @ApiProperty() @nid groomNid!: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsDateString() groomBirthDate?: string;
  @ApiProperty() @IsString() @IsNotEmpty() groomPhone!: string;

  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) brideName!: string;
  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(3, 150)
  brideFatherName?: string;
  @ApiProperty() @nid brideNid!: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsDateString() brideBirthDate?: string;
  @ApiProperty() @IsString() @IsNotEmpty() bridePhone!: string;

  @ApiProperty() @nid witness1Nid!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) witness1Name!: string;
  @ApiProperty() @nid witness2Nid!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @Length(3, 150) witness2Name!: string;

  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(3, 150)
  waliName?: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @Matches(/^\d{16}$/) waliNid?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() waliPhone?: string;
  @ApiPropertyOptional() @IsOptional() mahrAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mahrDescription?: string;

  @ApiPropertyOptional()
  @blankToUndefined
  @IsOptional()
  @IsString()
  @Length(3, 150)
  requestedOfficiant?: string;

  @ApiProperty({ enum: VenueType }) @IsEnum(VenueType) venueType!: VenueType;
  @ApiProperty() @IsString() @IsNotEmpty() province!: string;
  @ApiProperty() @IsString() @IsNotEmpty() district!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mosqueId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() venueAddress?: string;

  @ApiProperty() @IsDateString() preferredDateFrom!: string;
  @ApiPropertyOptional() @blankToUndefined @IsOptional() @IsDateString() preferredDateTo?: string;

  @ApiProperty() @IsEnum(['momo', 'bank', 'cash']) paymentMethod!: string;
}
