import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass@123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPass@456', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: 'NewPass@456', required: false })
  @IsOptional()
  @IsString()
  confirmPassword?: string;
}
