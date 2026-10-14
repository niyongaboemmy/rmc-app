import {
  PRODUCTION_ACCOUNTS,
  PRODUCTION_CATALOG,
  PRODUCT_CODE_RE,
  validateCatalog,
} from './10-irembopay-catalog.seed';
import { PaymentTypeKey } from '../../payment-settings/entities/payment-type.entity';

/**
 * The production catalog is transcribed from IremboPay's sheet. These guard
 * the transcription itself: a misread code fails a live payer with
 * PRODUCT_NOT_FOUND, which no other test would catch.
 */
describe('IremboPay production catalog', () => {
  it('has exactly the 14 products of the production sheet', () => {
    expect(PRODUCTION_CATALOG).toHaveLength(14);
  });

  it('passes its own validation', () => {
    expect(() => validateCatalog(PRODUCTION_CATALOG)).not.toThrow();
  });

  it('uses only payment types that exist in the enum', () => {
    const keys = Object.values(PaymentTypeKey) as string[];
    for (const entry of PRODUCTION_CATALOG) expect(keys).toContain(entry.paymentTypeKey);
  });

  it('labels every entry with the currency it is filed under', () => {
    for (const entry of PRODUCTION_CATALOG)
      expect(entry.label.endsWith(`_${entry.currency}`)).toBe(true);
  });

  it.each([
    ['DONATION', ['EUR', 'RWF', 'USD']],
    ['ZAKAT', ['EUR', 'RWF', 'USD']],
    ['QURAN_SUPPORT', ['EUR', 'RWF', 'USD']],
    ['HAJJ_FEE', ['RWF', 'USD']],
    ['ZAKAT_FITR', ['RWF']],
    ['MARRIAGE_FEE', ['RWF']],
    ['GOOD_CONDUCT_FEE', ['RWF']],
  ])('offers %s in %j', (key, currencies) => {
    const offered = PRODUCTION_CATALOG.filter((e) => e.paymentTypeKey === key)
      .map((e) => e.currency)
      .sort();
    expect(offered).toEqual(currencies);
  });

  it('has an account for every currency the catalog uses', () => {
    expect(PRODUCTION_ACCOUNTS).toEqual({ RWF: 'RMC_RWF', USD: 'RMC_USD', EUR: 'RMC_EUR' });
  });

  describe('validateCatalog', () => {
    const ok = {
      paymentTypeKey: 'DONATION',
      currency: 'RWF' as const,
      productCode: 'PC-47fbbd81b8',
      label: 'x',
    };

    // `l` for `1` and `O` for `0` are the likely misreads of a screenshot.
    it.each([
      'PC-4244ac5lef',
      'PC-4244ac51eF',
      'PC-O244ac51ef',
      'PC-4244ac51e',
      'PI-4244ac51ef',
      ' PC-4244ac51ef',
    ])('rejects the malformed code %j', (productCode) => {
      expect(() => validateCatalog([{ ...ok, productCode }])).toThrow(/malformed/);
    });

    it('rejects two products for the same type and currency', () => {
      expect(() => validateCatalog([ok, { ...ok, productCode: 'PC-0000000000' }])).toThrow(
        /two products for DONATION\/RWF/,
      );
    });

    it('matches the documented code shape', () => {
      expect(PRODUCT_CODE_RE.test('PC-62d7108dd9')).toBe(true);
    });
  });
});
