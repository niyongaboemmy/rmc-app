import { PartialType } from '@nestjs/swagger';
import { CreateDawahLessonDto } from './create-dawah-lesson.dto';

export class UpdateDawahLessonDto extends PartialType(CreateDawahLessonDto) {}
