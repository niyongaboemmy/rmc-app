import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class CreateCemeteryDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsString() @IsNotEmpty() @MaxLength(300)
  address: string;

  @IsInt() @Min(0)
  capacity: number;

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
