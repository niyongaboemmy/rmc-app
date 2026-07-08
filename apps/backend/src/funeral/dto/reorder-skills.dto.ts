import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderSkillsDto {
  /** Skill ids in the desired display order. */
  @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true })
  ids: string[];
}
