import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** value: 1 up, -1 down, 0 clears the vote. */
export class VoteDto {
  @ApiProperty({ enum: [1, -1, 0] })
  @IsIn([1, -1, 0])
  value: number;
}
