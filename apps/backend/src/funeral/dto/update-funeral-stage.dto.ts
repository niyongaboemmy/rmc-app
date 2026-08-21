import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFuneralStageDto {
  /** A funeral_steps.key — validated against existing steps in the service. */
  @IsString() @IsNotEmpty() @MaxLength(40)
  stage: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;

  @IsOptional() @IsString() @MaxLength(150)
  assignedVolunteer?: string;
}
