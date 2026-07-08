import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignVolunteerDto {
  /** A skill key (funeral_skills.key). */
  @IsString() @IsNotEmpty() @MaxLength(40)
  task: string;

  @IsUUID()
  requestId: string;
}
