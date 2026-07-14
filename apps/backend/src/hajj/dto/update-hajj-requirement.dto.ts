import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateHajjRequirementDto } from './create-hajj-requirement.dto';

/**
 * Everything on a requirement is editable except `key` — requests and the
 * registration form reference requirements by key, so it is immutable (the same
 * rule funeral steps follow).
 */
export class UpdateHajjRequirementDto extends PartialType(
  OmitType(CreateHajjRequirementDto, ['key'] as const),
) {}
