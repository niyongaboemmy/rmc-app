import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

/**
 * A file already uploaded to the file-server, as stored in a jsonb
 * `attachments` column.
 *
 * Declare `attachments` with this class, never as a bare `unknown[]` or inline
 * object type. The global ValidationPipe runs with `enableImplicitConversion`,
 * and without a `@Type` it converts each element to the property's reflected
 * type — `Array` — so every uploaded file was saved as `[]`.
 */
export class AttachmentDto {
  @ApiProperty() @IsString() @MaxLength(500) key: string;
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiProperty() @IsString() @MaxLength(255) mimeType: string;
  @ApiProperty() @IsInt() @Min(0) size: number;
}
