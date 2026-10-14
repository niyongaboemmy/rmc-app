/**
 * Which IremboPay settings fields belong to which merchant.
 *
 * Sandbox and production are separate IremboPay merchants with their own keys
 * and payment accounts. Both sets are stored side by side on the one settings
 * row, and the Test-mode flag picks which set is live, so that:
 *   - the admin form shows every production value even while the site is still
 *     on sandbox, and the sandbox values stay as a working backup;
 *   - going live, and rolling back, is the toggle — no values are retyped.
 *
 * The unprefixed fields are production; the `sandbox`-prefixed fields are the
 * sandbox merchant. An environment that predates the split (sandbox values in
 * the unprefixed fields, nothing prefixed) still works in test mode: sandbox
 * falls back to the unprefixed fields when its own are empty. Production never
 * falls back to sandbox — that is the mistake that sent sandbox keys to the
 * live API once.
 *
 * Kept free of Nest dependencies: both the settings service (which owns the
 * row) and the IremboPay config service (which reads it) need the same answer,
 * and the latter already depends on the former.
 */

export type IremboPayEnvironment = 'sandbox' | 'production';

export interface IremboPayMerchantFields {
  secretKey: string;
  publicKey: string;
  /** RWF account — fixes the currency of RWF invoices. */
  accountRwf: string;
  accountUsd: string;
  accountEur: string;
}

/** Settings keys of each merchant's fields. */
export const IREMBOPAY_FIELD_KEYS: Record<
  IremboPayEnvironment,
  Record<keyof IremboPayMerchantFields, string>
> = {
  production: {
    secretKey: 'secretKey',
    publicKey: 'publicKey',
    accountRwf: 'paymentAccountIdentifier',
    accountUsd: 'paymentAccountIdentifierUsd',
    accountEur: 'paymentAccountIdentifierEur',
  },
  sandbox: {
    secretKey: 'sandboxSecretKey',
    publicKey: 'sandboxPublicKey',
    accountRwf: 'sandboxPaymentAccountIdentifier',
    accountUsd: 'sandboxPaymentAccountIdentifierUsd',
    accountEur: 'sandboxPaymentAccountIdentifierEur',
  },
};

/** Secret settings keys, masked on read. */
export const IREMBOPAY_SENSITIVE_FIELDS = ['secretKey', 'sandboxSecretKey'];

const value = (raw: Record<string, string | undefined>, key: string): string =>
  (raw[key] ?? '').trim();

/** The fields of the merchant `environment` names, after the legacy fallback. */
export function iremboPayFieldsFor(
  raw: Record<string, string | undefined>,
  environment: IremboPayEnvironment,
): IremboPayMerchantFields {
  const own = IREMBOPAY_FIELD_KEYS[environment];
  const pick = (field: keyof IremboPayMerchantFields): string => value(raw, own[field]);

  if (environment === 'production') {
    return {
      secretKey: pick('secretKey'),
      publicKey: pick('publicKey'),
      accountRwf: pick('accountRwf'),
      accountUsd: pick('accountUsd'),
      accountEur: pick('accountEur'),
    };
  }

  // Legacy single-set rows: only a sandbox with no keys of its own inherits the
  // unprefixed ones, and then wholesale — never a sandbox key with a
  // production account. USD/EUR are not inherited: the unprefixed ones are the
  // production merchant's accounts, which do not exist on the sandbox.
  const legacy = !pick('secretKey') && !pick('publicKey');
  const prod = IREMBOPAY_FIELD_KEYS.production;
  return {
    secretKey: legacy ? value(raw, prod.secretKey) : pick('secretKey'),
    publicKey: legacy ? value(raw, prod.publicKey) : pick('publicKey'),
    accountRwf: pick('accountRwf') || (legacy ? value(raw, prod.accountRwf) : ''),
    accountUsd: pick('accountUsd'),
    accountEur: pick('accountEur'),
  };
}

/**
 * Whether the merchant `environment` names can take a payment. Production keys
 * identical to the sandbox ones are treated as missing: that is a sandbox key
 * pasted into the production field, and it would only fail with a 401.
 */
export function iremboPayReady(
  raw: Record<string, string | undefined>,
  environment: IremboPayEnvironment,
): boolean {
  const f = iremboPayFieldsFor(raw, environment);
  if (!f.secretKey || !f.publicKey || !f.accountRwf) return false;
  if (environment === 'production') {
    const sandboxSecret = value(raw, IREMBOPAY_FIELD_KEYS.sandbox.secretKey);
    if (sandboxSecret && sandboxSecret === f.secretKey) return false;
  }
  return true;
}
