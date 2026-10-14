import { DonationMeta } from './donation-meta';

/**
 * The payment type a donation is collected under, which `ProviderProductsService`
 * turns into an IremboPay product per currency and merchant.
 *
 * IremboPay's production merchant separates donations by intention — Sadaqat,
 * Zakatul maal, Zakatul fitr, Qur'an Support — so finance can tell an
 * obligation from a gift. The intention is already on every donation, in the
 * message metadata the donate page writes, so it is read from there:
 *
 *   niyyah zakat-al-fitr        → ZAKAT_FITR     (RWF only)
 *   niyyah zakat, fund zakat    → ZAKAT          (the Zakat calculator's line)
 *   category/fund quran         → QURAN_SUPPORT
 *   anything else               → DONATION       (Sadaqat; lillah and sadaqah too)
 *
 * The donor's intention outranks the line's category: a gift to a Qur'an
 * programme given *as* zakat is zakat.
 */
export const DONATION_PAYMENT_TYPES = ['DONATION', 'ZAKAT', 'ZAKAT_FITR', 'QURAN_SUPPORT'] as const;
export type DonationPaymentType = (typeof DONATION_PAYMENT_TYPES)[number];

/** Currencies RMC holds an IremboPay payment account in. */
export const DONATION_CURRENCIES = ['RWF', 'USD', 'EUR'] as const;

export function donationPaymentTypeKey(meta: DonationMeta): DonationPaymentType {
  const niyyah = meta.niyyah?.toLowerCase();
  const category = meta.category?.toLowerCase();
  const fund = meta.fund?.toLowerCase();

  if (niyyah === 'zakat-al-fitr' || fund === 'zakat-al-fitr') return 'ZAKAT_FITR';
  if (niyyah === 'zakat' || fund === 'zakat') return 'ZAKAT';
  if (category === 'quran' || fund === 'quran') return 'QURAN_SUPPORT';
  return 'DONATION';
}
