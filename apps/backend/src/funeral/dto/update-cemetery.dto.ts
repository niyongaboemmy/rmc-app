import { IsInt, IsNumber, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class UpdateCemeteryDto {
  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @IsOptional() @IsInt() @Min(0)
  capacity?: number;

  @IsOptional() @IsInt() @Min(0)
  used?: number;

  @IsOptional() @IsString() @MaxLength(150)
  contactPerson?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  lat?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  lng?: number;
}
