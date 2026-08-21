import { PartialType } from '@nestjs/swagger';
import { CreateScholarshipProgramDto } from './create-scholarship-program.dto';

export class UpdateScholarshipProgramDto extends PartialType(CreateScholarshipProgramDto) {}
