import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateScholarshipApplicationDto } from './create-scholarship-application.dto';

/**
 * Editing a draft application.
 *
 * This has to be a real class. `@Body() dto: Partial<CreateScholarshipApplicationDto>`
 * does NOT get validated — a TS `Partial<T>` erases to `Object` at runtime, so
 * ValidationPipe has no metatype to work with and passes anything through. That
 * is not theoretical here: before this existed, the create endpoint rejected
 * `phone: "NOT-A-PHONE"` with a 400 while the update endpoint next to it stored
 * it, a 5000-character motivation went in against a 1000-character rule, and an
 * education level outside the enum reached Postgres and came back as a 500.
 *
 * The phone is what the OTP tracking flow sends an SMS to, so "the column
 * accepts it" was never the standard it had to meet.
 *
 * `programId` is omitted rather than made optional, because `updateDraft`
 * already ignores it on purpose: the scholarship an application targets is
 * fixed when the draft is created, and letting the payload move it would let
 * someone fill a form against an open scholarship and retarget it at one whose
 * deadline has passed. Omitting it makes the contract say what the code does.
 *
 * Same reasoning, same shape as tenders' UpdateTenderApplicationDto — which is
 * where this bug was diagnosed the first time.
 */
export class UpdateScholarshipApplicationDto extends PartialType(
  OmitType(CreateScholarshipApplicationDto, ['programId'] as const),
) {}
