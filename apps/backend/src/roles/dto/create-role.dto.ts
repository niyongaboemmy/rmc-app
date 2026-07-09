import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, MaxLength } from 'class-validator';
import { Permission } from '../../common/types/permissions.enum';

export class CreateRoleDto {
  @ApiProperty({ example: 'Content Manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'content_manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ example: 'Manages blog posts and announcements' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: Permission,
    isArray: true,
    example: [Permission.CONTENT_CREATE, Permission.CONTENT_EDIT],
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
