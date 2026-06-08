import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Raw UUID refresh token received at login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
