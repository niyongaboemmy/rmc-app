import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ContentStatus } from '../entities/dawah-course.entity';

/** Body for PATCH /admin/dawah/courses/:id/status — draft ⇄ published ⇄ archived. */
export class UpdateCourseStatusDto {
  @ApiProperty({ enum: ContentStatus })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}
