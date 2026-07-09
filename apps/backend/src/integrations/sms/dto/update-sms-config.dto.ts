import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSmsConfigDto {
  @ApiProperty({ description: 'InTouch account username', example: 'RMC' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username: string;

  @ApiProperty({
    description: 'InTouch account password (stored encrypted). Send "_KEEP_" to leave unchanged.',
  })
  @IsString()
  @MaxLength(200)
  password: string;

  @ApiPropertyOptional({
    description: 'Sender ID shown to recipients (max 11 chars)',
    example: 'RMC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  senderName?: string;

  @ApiPropertyOptional({ description: 'Delivery report callback URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  dlrUrl?: string;

  @ApiPropertyOptional({ description: 'Enable or disable SMS sending' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
