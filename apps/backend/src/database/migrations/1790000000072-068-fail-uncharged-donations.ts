import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marks as failed every donation that was recorded "completed" without anyone
 * ever being charged.
 *
 * Both public creation routes used to end with
 * `status = useGateway ? pending : completed`, which treated "we cannot charge
 * you" as "you have paid". It was reachable whenever the gateway was
 * unconfigured or inactive, whenever a card checkout carried no phone, and by
 * anyone at all posting `paymentMethod: "cash"` to an unauthenticated route.
 * The service no longer does this — it refuses instead — but the rows those
 * paths already wrote are still counted in campaign totals as money received.
 *
 * ── Why `payment_reference IS NULL` is the right test ────────────────────────
 *
 * That column is set only from a gateway's own response, so a null means no
 * charge was ever attempted. Nothing else can produce a completed row without
 * one:
 *
 *   - the webhook and reconciliation services both MATCH on payment_reference,
 *     so neither can complete a row that has none;
 *   - `refreshPaymentStatus` returns early when it is null, without calling the
 *     gateway;
 *   - the admin donation-edit route (`PATCH /admin/donations/:id`) is commented
 *     out, so no one can have marked a donation paid by hand.
 *
 * There is therefore no legitimate completed-and-uncharged donation for this to
 * catch by mistake. On the database this was written against it matched 31 rows
 * totalling ~24.4M RWF — 12 mobile money (the unconfigured-gateway path) and 19
 * that never attempted a charge at all (card, bank, paypal, and 5 with no
 * payment method set).
 *
 * The rows are kept, not deleted: they are a real record that someone tried to
 * donate, and some may be genuine gifts that were settled off-platform. Failed
 * is simply the honest status — it stops them counting as received while
 * leaving them visible in the admin list for follow-up.
 */
export class FailUnchargedDonations1790000000072 implements MigrationInterface {
  name = 'FailUnchargedDonations1790000000072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The marker is what makes down() exact: it is written only here, and every
    // row this touches is verified below to have had both columns null, so
    // nothing pre-existing is overwritten. 'NEVER_CHARGED' is 13 chars, within
    // gateway_response_code's varchar(20).
    const [{ count }] = (await queryRunner.query(`
      SELECT COUNT(*)::int AS count FROM "donations"
      WHERE "status" = 'completed'
        AND "payment_reference" IS NULL
        AND ("gateway_response_code" IS NOT NULL OR "gateway_message" IS NOT NULL)
    `)) as { count: number }[];

    if (count > 0) {
      // Defensive: if a future code path starts writing these columns without a
      // payment reference, the marker would clobber data down() could not put
      // back. Stop rather than lose it.
      throw new Error(
        `Refusing to run: ${count} uncharged donation(s) already carry gateway columns. ` +
          `Inspect them before re-running — this migration assumes those columns are free to use as a revert marker.`,
      );
    }

    await queryRunner.query(`
      UPDATE "donations"
         SET "status" = 'failed',
             "gateway_response_code" = 'NEVER_CHARGED',
             "gateway_message" = 'Recorded as completed by the pre-fix assume-paid fallback; no payment was ever requested.'
       WHERE "status" = 'completed'
         AND "payment_reference" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Exact reversal: only rows this migration marked, and both columns go back
    // to the null they are verified to have held in up().
    await queryRunner.query(`
      UPDATE "donations"
         SET "status" = 'completed',
             "gateway_response_code" = NULL,
             "gateway_message" = NULL
       WHERE "status" = 'failed'
         AND "payment_reference" IS NULL
         AND "gateway_response_code" = 'NEVER_CHARGED'
    `);
  }
}
