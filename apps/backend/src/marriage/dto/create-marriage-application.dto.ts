import {
  IsString, IsNotEmpty, Length, Matches, IsEnum, IsOptional,
  IsDateString, IsDecimal, Min, IsNumberString, IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VenueType } from '../entities/marriage-application.entity';

export class CreateMarriageApplicationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  notificationEmail?: string;

  // Groom
  @ApiProperty()
  @IsString() @IsNotEmpty() @Length(3, 150)
  groomName: string;

  @ApiProperty()
  @Matches(/^\d{16}$/, { message: 'Groom NID must be exactly 16 digits' })
  groomNid: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  groomPhone?: string;

  // Bride
  @ApiProperty()
  @IsString() @IsNotEmpty() @Length(3, 150)
  brideName: string;

  @ApiProperty()
  @Matches(/^\d{16}$/, { message: 'Bride NID must be exactly 16 digits' })
  brideNid: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bridePhone?: string;

  // Witnesses
  @ApiProperty()
  @Matches(/^\d{16}$/, { message: 'Witness 1 NID must be exactly 16 digits' })
  witness1Nid: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(3, 150)
  witness1Name?: string;

  @ApiProperty()
  @Matches(/^\d{16}$/, { message: 'Witness 2 NID must be exactly 16 digits' })
  witness2Nid: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(3, 150)
  witness2Name?: string;

  // Islamic requirements
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(3, 150)
  waliName?: string;

  @ApiPropertyOptional()
  @IsOptional() @Matches(/^\d{16}$/)
  waliNid?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  waliPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  mahrAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  mahrDescription?: string;

  // Officiant
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(3, 150)
  requestedOfficiant?: string;

  // Venue
  @ApiProperty({ enum: VenueType })
  @IsEnum(VenueType)
  venueType: VenueType;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  mosqueId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  venueAddress?: string;

  // Scheduling
  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  preferredDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  preferredDateTo?: string;

  // Payment
  @ApiPropertyOptional()
  @IsOptional() @IsEnum(['momo', 'bank', 'cash'])
  paymentMethod?: string;
}
