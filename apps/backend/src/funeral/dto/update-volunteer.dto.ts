import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateVolunteerDto {
  @IsOptional() @IsString() @MaxLength(150)
  name?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsUUID()
  mosqueId?: string;

  /** Skill keys (funeral_skills.key). */
  @IsOptional() @IsArray() @ArrayMinSize(1) @IsString({ each: true }) @MaxLength(40, { each: true })
  skills?: string[];
}
