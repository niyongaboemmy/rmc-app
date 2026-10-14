import { iremboPayFieldsFor, iremboPayReady } from './irembopay-fields';

/**
 * Both merchants live on one settings row; Test mode picks one. These guard
 * the two mistakes that matter: sandbox values reaching production, and a
 * pre-split row losing its working sandbox credentials.
 */
describe('IremboPay merchant fields', () => {
  const SPLIT = {
    secretKey: 'sk_PROD',
    publicKey: 'pk_PROD',
    paymentAccountIdentifier: 'RMC_RWF',
    paymentAccountIdentifierUsd: 'RMC_USD',
    paymentAccountIdentifierEur: 'RMC_EUR',
    sandboxSecretKey: 'sk_SBX',
    sandboxPublicKey: 'pk_SBX',
    sandboxPaymentAccountIdentifier: 'RMC-RWF',
  };

  it('production reads the unprefixed fields', () => {
    expect(iremboPayFieldsFor(SPLIT, 'production')).toEqual({
      secretKey: 'sk_PROD',
      publicKey: 'pk_PROD',
      accountRwf: 'RMC_RWF',
      accountUsd: 'RMC_USD',
      accountEur: 'RMC_EUR',
    });
  });

  it('sandbox reads its own fields and never the production USD/EUR accounts', () => {
    expect(iremboPayFieldsFor(SPLIT, 'sandbox')).toEqual({
      secretKey: 'sk_SBX',
      publicKey: 'pk_SBX',
      accountRwf: 'RMC-RWF',
      accountUsd: '',
      accountEur: '',
    });
  });

  it('a pre-split row keeps working in sandbox (legacy fallback)', () => {
    const legacy = {
      secretKey: 'sk_SBX',
      publicKey: 'pk_SBX',
      paymentAccountIdentifier: 'RMC-RWF',
    };
    expect(iremboPayFieldsFor(legacy, 'sandbox')).toMatchObject({
      secretKey: 'sk_SBX',
      publicKey: 'pk_SBX',
      accountRwf: 'RMC-RWF',
    });
    expect(iremboPayReady(legacy, 'sandbox')).toBe(true);
  });

  it('production never falls back to sandbox values', () => {
    const sandboxOnly = {
      sandboxSecretKey: 'sk_SBX',
      sandboxPublicKey: 'pk_SBX',
      paymentAccountIdentifier: 'RMC_RWF',
    };
    expect(iremboPayFieldsFor(sandboxOnly, 'production').secretKey).toBe('');
    expect(iremboPayReady(sandboxOnly, 'production')).toBe(false);
  });

  it('is ready per merchant', () => {
    expect(iremboPayReady(SPLIT, 'production')).toBe(true);
    expect(iremboPayReady(SPLIT, 'sandbox')).toBe(true);
    const noProdKeys = { ...SPLIT, secretKey: '', publicKey: '' };
    expect(iremboPayReady(noProdKeys, 'production')).toBe(false);
    expect(iremboPayReady(noProdKeys, 'sandbox')).toBe(true);
  });

  /** A sandbox key pasted into the production field would only ever 401. */
  it('treats a production secret equal to the sandbox one as not ready', () => {
    expect(iremboPayReady({ ...SPLIT, secretKey: 'sk_SBX' }, 'production')).toBe(false);
  });

  it('requires the RWF account', () => {
    expect(iremboPayReady({ ...SPLIT, paymentAccountIdentifier: '' }, 'production')).toBe(false);
  });
});
