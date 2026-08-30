import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marks as failed every donation left stuck in `pending` with no payment
 * reference — the rows nothing will ever resolve.
 *
 * `create()` saves the donation before calling the gateway, so a charge that
 * threw left the row `pending` with `payment_reference` still null. Nothing
 * picks those up again: DonationReconciliationService filters on
 * `d.paymentReference` before re-checking anything, and the webhook services
 * match on it too. So the row sits there permanently — never re-checked, never
 * cleaned up — while still counting toward campaign totals as money on its way.
 *
 * The service no longer creates them (a failed charge now lands as FAILED with
 * `gateway_response_code = 'UNREACHABLE'`), but the existing rows remain. On the
 * database this was written against there were 3, all from June 2026, totalling
 * 40,050 RWF.
 *
 * ── The one-hour floor is not cosmetic ───────────────────────────────────────
 *
 * A donation is briefly `pending` with a null reference during normal operation
 * too: the window between the initial save and `charge()` returning. If this ran
 * during that window it would mark a live payment failed while the donor was
 * still being asked to approve it on their handset. The client's worst case is
 * three 30s attempts plus backoff — roughly 95 seconds — so an hour clears it by
 * a wide margin while still catching everything genuinely stuck.
 *
 * Rows are kept rather than deleted, for the same reason as migration 068: they
 * record a real attempt to donate, and failed is simply the honest status.
 */
export class FailStuckPendingDonations1790000000073 implements MigrationInterface {
  name = 'FailStuckPendingDonations1790000000073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A DISTINCT marker from migration 068's 'NEVER_CHARGED'. The two sweeps
    // restore to different statuses — this one to 'pending', 068 to 'completed'
    // — so sharing a marker would make each one's down() silently rewrite the
    // other's rows to the wrong status.
    const [{ count }] = (await queryRunner.query(`
      SELECT COUNT(*)::int AS count FROM "donations"
      WHERE "status" = 'pending'
        AND "payment_reference" IS NULL
        AND "donated_at" < now() - interval '1 hour'
        AND ("gateway_response_code" IS NOT NULL OR "gateway_message" IS NOT NULL)
    `)) as { count: number }[];

    if (count > 0) {
      // The marker is what makes down() exact; refuse rather than overwrite
      // something it could not put back.
      throw new Error(
        `Refusing to run: ${count} stuck pending donation(s) already carry gateway columns. ` +
          `Inspect them before re-running — this migration assumes those columns are free to use as a revert marker.`,
      );
    }

    await queryRunner.query(`
      UPDATE "donations"
         SET "status" = 'failed',
             "gateway_response_code" = 'STUCK_PENDING',
             "gateway_message" = 'Left pending with no payment reference by a charge that never completed; no payment was taken.'
       WHERE "status" = 'pending'
         AND "payment_reference" IS NULL
         AND "donated_at" < now() - interval '1 hour'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Exact reversal: only rows this migration marked, back to the pending
    // status and the null columns they are verified to have held in up().
    // No age condition here — these rows are being restored to what they were,
    // and their age has moved on since up() ran.
    await queryRunner.query(`
      UPDATE "donations"
         SET "status" = 'pending',
             "gateway_response_code" = NULL,
             "gateway_message" = NULL
       WHERE "status" = 'failed'
         AND "payment_reference" IS NULL
         AND "gateway_response_code" = 'STUCK_PENDING'
    `);
  }
}
