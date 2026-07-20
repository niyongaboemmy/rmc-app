import { PartialType } from '@nestjs/swagger';
import { CreateDawahCourseDto } from './create-dawah-course.dto';

/**
 * `slug` stays on the update DTO — a DRAFT course has no inbound links, so
 * renaming it is a normal editing action. The service, not the DTO, is what
 * refuses the change once the course is published: see
 * DawahCourseService.update().
 */
export class UpdateDawahCourseDto extends PartialType(CreateDawahCourseDto) {}
