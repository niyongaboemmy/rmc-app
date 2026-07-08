import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderStepsDto {
  /** Step ids in the desired display order. */
  @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true })
  ids: string[];
}
