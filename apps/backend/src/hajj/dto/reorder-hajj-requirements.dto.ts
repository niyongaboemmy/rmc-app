import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderHajjRequirementsDto {
  /** Requirement ids in the desired display order. */
  @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true })
  ids: string[];
}
