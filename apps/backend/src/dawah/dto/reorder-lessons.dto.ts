import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderLessonsDto {
  /**
   * The course's lesson ids in the desired order. Must be the COMPLETE set —
   * the service rejects a partial list rather than reordering what it can, so a
   * stale client that omits a lesson cannot silently scramble the outline.
   */
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];
}
