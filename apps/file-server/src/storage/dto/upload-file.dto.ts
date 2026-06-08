import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiPropertyOptional({
    description: 'Target folder/prefix inside the bucket (e.g. "avatars", "documents")',
    example: 'avatars',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_\-/]+$/, {
    message: 'folder must contain only alphanumerics, hyphens, underscores, or forward slashes',
  })
  folder?: string;
}
