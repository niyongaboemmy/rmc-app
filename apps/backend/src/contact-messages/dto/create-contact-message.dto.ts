import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Payload sent by the public Contact page when a visitor submits the form. */
export class CreateContactMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  message: string;
}
