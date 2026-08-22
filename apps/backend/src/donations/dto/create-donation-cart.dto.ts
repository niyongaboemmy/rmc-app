import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDonationDto } from './create-donation.dto';

export class CreateDonationCartDto {
  @ApiProperty({
    type: [CreateDonationDto],
    description: 'One entry per campaign in the basket. All are settled by a single payment.',
  })
  @IsArray()
  @ArrayMinSize(1)
  // A basket this large is a mistake or an abuse attempt, not a donor. The
  // provider documents no item limit, so the bound is ours to choose.
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateDonationDto)
  items: CreateDonationDto[];

  @ApiPropertyOptional({
    enum: ['momo', 'card'],
    description: "'momo' pushes a prompt; 'card' issues an invoice for the hosted widget.",
  })
  @IsOptional()
  @IsIn(['momo', 'card'])
  channel?: 'momo' | 'card';
}
