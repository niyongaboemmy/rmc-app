import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives the IremboPay settings row one field set per merchant.
 *
 * Until now the row had one set of keys and accounts, holding whichever
 * merchant was live — so the production values could not be entered (or even
 * shown) while the site still took sandbox payments, and going live meant
 * overwriting the sandbox values. From here the unprefixed fields are the
 * production merchant and the `sandbox*` fields the sandbox one; Test mode
 * picks the set (see `payment-settings/irembopay-fields.ts`).
 *
 * On a row in test mode the current keys and RWF account are sandbox values, so
 * they move to the sandbox fields. The production fields then get what is known
 * about the production merchant without its keys: the three payment accounts
 * and IremboPay's limits. A row already live (test mode off) holds production
 * values in the right place and is left as it is.
 *
 * Runs inside the deploy, immediately before the new code starts, so there is
 * no window in which the running code reads a half-moved row for more than the
 * seconds a reload takes.
 */
const PRODUCTION_DEFAULTS = {
  paymentAccountIdentifier: 'RMC_RWF',
  paymentAccountIdentifierUsd: 'RMC_USD',
  paymentAccountIdentifierEur: 'RMC_EUR',
  maxTransactionRwf: '50000000',
  maxDailyRwf: '100000000',
  maxTransactionUsd: '100000',
  maxDailyUsd: '300000',
  maxTransactionEur: '100000',
  maxDailyEur: '300000',
};

export class IremboPayMerchantFields1790000000086 implements MigrationInterface {
  name = 'IremboPayMerchantFields1790000000086';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: { id: string; settings: Record<string, string> | null; is_test_mode: boolean }[] =
      await queryRunner.query(`
        SELECT s.id, s.settings, s.is_test_mode
          FROM payment_method_settings s
          JOIN payment_methods m ON m.id = s.payment_method_id
         WHERE m.code = 'IREMBOPAY'`);

    for (const row of rows) {
      const s: Record<string, string> = { ...(row.settings ?? {}) };
      const alreadySplit = !!(s.sandboxSecretKey || s.sandboxPublicKey);

      if (row.is_test_mode && !alreadySplit) {
        for (const [from, to] of [
          ['secretKey', 'sandboxSecretKey'],
          ['publicKey', 'sandboxPublicKey'],
          ['paymentAccountIdentifier', 'sandboxPaymentAccountIdentifier'],
        ]) {
          if (s[from]) s[to] = s[from];
          delete s[from];
        }
        // A USD/EUR account on a sandbox row was a sandbox account (if any).
        for (const [from, to] of [
          ['paymentAccountIdentifierUsd', 'sandboxPaymentAccountIdentifierUsd'],
          ['paymentAccountIdentifierEur', 'sandboxPaymentAccountIdentifierEur'],
        ]) {
          if (s[from]) s[to] = s[from];
          delete s[from];
        }
      }
      delete s.credentialsFor;

      for (const [key, value] of Object.entries(PRODUCTION_DEFAULTS)) {
        if (!s[key]) s[key] = value;
      }

      await queryRunner.query(
        `UPDATE payment_method_settings SET settings = $1, updated_at = now() WHERE id = $2`,
        [JSON.stringify(s), row.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Back to one field set: whichever merchant is live keeps the unprefixed
    // fields. On a test-mode row that is the sandbox, so its values move back;
    // the production accounts and limits added by up() are dropped.
    const rows: { id: string; settings: Record<string, string> | null; is_test_mode: boolean }[] =
      await queryRunner.query(`
        SELECT s.id, s.settings, s.is_test_mode
          FROM payment_method_settings s
          JOIN payment_methods m ON m.id = s.payment_method_id
         WHERE m.code = 'IREMBOPAY'`);

    for (const row of rows) {
      const s: Record<string, string> = { ...(row.settings ?? {}) };
      if (row.is_test_mode) {
        for (const key of Object.keys(PRODUCTION_DEFAULTS)) {
          if (s[key] === PRODUCTION_DEFAULTS[key as keyof typeof PRODUCTION_DEFAULTS])
            delete s[key];
        }
        for (const [to, from] of [
          ['secretKey', 'sandboxSecretKey'],
          ['publicKey', 'sandboxPublicKey'],
          ['paymentAccountIdentifier', 'sandboxPaymentAccountIdentifier'],
          ['paymentAccountIdentifierUsd', 'sandboxPaymentAccountIdentifierUsd'],
          ['paymentAccountIdentifierEur', 'sandboxPaymentAccountIdentifierEur'],
        ]) {
          if (s[from]) s[to] = s[from];
        }
      }
      for (const key of Object.keys(s)) if (key.startsWith('sandbox')) delete s[key];

      await queryRunner.query(
        `UPDATE payment_method_settings SET settings = $1, updated_at = now() WHERE id = $2`,
        [JSON.stringify(s), row.id],
      );
    }
  }
}
