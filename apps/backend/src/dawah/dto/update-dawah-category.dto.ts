import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDawahCategoryDto } from './create-dawah-category.dto';

/**
 * Everything is editable except `slug`. The public listings filter by
 * `?category=<slug>`, so the slug is part of the URL contract — renaming one
 * would break every saved or shared filter link pointing at it. Same rule
 * hajj_requirements applies to `key`.
 */
export class UpdateDawahCategoryDto extends PartialType(
  OmitType(CreateDawahCategoryDto, ['slug'] as const),
) {}
