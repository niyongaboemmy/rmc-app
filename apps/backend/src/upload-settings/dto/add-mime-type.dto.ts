import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMimeTypeDto {
  @ApiProperty({ description: 'MIME type to allow', example: 'application/zip' })
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*$/, {
    message: 'Invalid MIME type format',
  })
  mimeType: string;
}
