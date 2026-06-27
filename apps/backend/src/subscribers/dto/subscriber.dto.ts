import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** One-click unsubscribe payload (token from the email link). */
export class UnsubscribeDto {
  @ApiProperty()
  @IsUUID()
  token: string;
}

/** Send a one-off test email to verify SMTP delivery. */
export class TestEmailDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  to: string;
}

/** Public newsletter signup payload. */
export class CreateSubscriberDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ enum: ['en', 'rw', 'ar'] })
  @IsOptional()
  @IsIn(['en', 'rw', 'ar'])
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;
}

/** Admin broadcast/newsletter payload — sent to all active subscribers. */
export class BroadcastDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;

  /** HTML body (admin-authored rich text). */
  @ApiProperty()
  @IsString()
  @MinLength(1)
  html: string;
}
