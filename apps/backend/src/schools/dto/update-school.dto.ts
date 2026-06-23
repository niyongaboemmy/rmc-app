import { PartialType } from '@nestjs/swagger';
import { CreateSchoolDto } from './create-school.dto';

/** Admin edit of a school — all fields optional. */
export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {}
