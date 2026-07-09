import { IsArray, IsUUID, IsIn, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShareItemDto {
  @ApiProperty({ type: [String], example: ['user-uuid-1', 'user-uuid-2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({ enum: ['viewer', 'editor'], example: 'viewer' })
  @IsIn(['viewer', 'editor'])
  permission: 'viewer' | 'editor';
}
