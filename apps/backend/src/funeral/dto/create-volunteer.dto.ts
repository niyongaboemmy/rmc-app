import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateVolunteerDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsUUID()
  mosqueId: string;

  /** Skill keys (funeral_skills.key). */
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) @MaxLength(40, { each: true })
  skills: string[];
}
