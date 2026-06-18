import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateContentDto {
  @ApiProperty({
    description:
      'Arbitrary content payload for the section. Typically per-language fields (…En/…Rw/…Ar) plus scalar settings.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  value: Record<string, unknown>;
}
