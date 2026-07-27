import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTenderApplicationDto } from './create-tender-application.dto';

/**
 * Editing a bid.
 *
 * `tenderId` is omitted rather than made optional: a bid belongs to the tender it
 * was placed on, and letting the payload move it would sidestep both the
 * one-active-bid-per-tender rule and the deadline check that guarded creation.
 *
 * This exists as a real class because `@Body() dto: Partial<CreateTenderApplicationDto>`
 * does NOT get validated — a TS `Partial<T>` erases to `Object` at runtime, so
 * ValidationPipe has no metatype to work with and silently passes anything
 * through. That was survivable while updates were behind a login; the OTP
 * tracking session makes it a public write path, so the rules have to be real.
 */
export class UpdateTenderApplicationDto extends PartialType(
  OmitType(CreateTenderApplicationDto, ['tenderId'] as const),
) {}
