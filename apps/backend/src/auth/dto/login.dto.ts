import { IsString, MinLength, IsOptional, Length, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'ahmed@example.com or +250781234567', description: 'Email or phone' })
  @IsString()
  @MinLength(1)
  identifier: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({ example: '123456', description: '6-digit TOTP code (if MFA enabled)' })
  @IsOptional()
  @IsNumberString()
  @Length(6, 6)
  mfaCode?: string;
}
