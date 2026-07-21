import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

// Rwandan phone: local 07XXXXXXXX or international +250 / 250 7XXXXXXXX.
const RW_PHONE = /^(?:\+?250|0)7\d{8}$/;

export class CreateFuneralTransportDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsUUID()
  mosqueId: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  location: string;

  @IsString() @IsNotEmpty() @Matches(RW_PHONE, { message: 'phone must be a 10-digit Rwandan number' })
  phone: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
