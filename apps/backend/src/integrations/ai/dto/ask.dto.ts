import { IsString, IsIn, IsArray, ValidateNested, MaxLength, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Message text' })
  @IsString()
  @MaxLength(4000)
  content: string;
}

export class AskDto {
  @ApiProperty({ type: [ChatMessageDto], description: 'Conversation history (oldest first)' })
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}
