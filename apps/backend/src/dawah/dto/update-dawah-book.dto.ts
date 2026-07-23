import { PartialType } from '@nestjs/swagger';
import { CreateDawahBookDto } from './create-dawah-book.dto';

/**
 * `slug` stays editable on the DTO — the SERVICE refuses the change once the
 * book is published, because by then the slug is a shared permalink. See
 * DawahBookService.update().
 */
export class UpdateDawahBookDto extends PartialType(CreateDawahBookDto) {}
