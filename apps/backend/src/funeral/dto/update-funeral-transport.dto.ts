import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const RW_PHONE = /^(?:\+?250|0)7\d{8}$/;

export class UpdateFuneralTransportDto {
  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @IsOptional() @IsUUID()
  mosqueId?: string;

  @IsOptional() @IsString() @MaxLength(200)
  location?: string;

  @IsOptional() @IsString() @Matches(RW_PHONE, { message: 'phone must be a 10-digit Rwandan number' })
  phone?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
