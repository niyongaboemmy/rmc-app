import { donationPaymentTypeKey } from './donation-payment-type';
import { parseDonationMeta } from './donation-meta';

/**
 * Which IremboPay product a donation settles under. Production separates
 * Sadaqat, Zakatul maal, Zakatul fitr and Qur'an Support, so a wrong answer
 * here puts an obligation on the wrong ledger line.
 */
describe('donationPaymentTypeKey', () => {
  it.each([
    ['niyyah:sadaqah|category:charity', 'DONATION'],
    ['niyyah:lillah|category:school', 'DONATION'],
    ['', 'DONATION'],
    ['a legacy free-text message', 'DONATION'],
    ['niyyah:zakat|category:charity', 'ZAKAT'],
    // The Zakat calculator's line: fund zakat under any intention.
    ['niyyah:sadaqah|category:charity|fund:zakat', 'ZAKAT'],
    ['niyyah:zakat-al-fitr', 'ZAKAT_FITR'],
    ['niyyah:sadaqah|fund:zakat-al-fitr', 'ZAKAT_FITR'],
    ['niyyah:sadaqah|category:quran', 'QURAN_SUPPORT'],
    ['niyyah:lillah|category:religious|fund:quran', 'QURAN_SUPPORT'],
    // Intention outranks category: a Qur'an gift given as zakat is zakat.
    ['niyyah:zakat|category:quran', 'ZAKAT'],
    ['niyyah:zakat-al-fitr|category:quran', 'ZAKAT_FITR'],
    ['niyyah:ZAKAT|category:charity', 'ZAKAT'],
  ])('%j → %s', (message, expected) => {
    expect(donationPaymentTypeKey(parseDonationMeta(message))).toBe(expected);
  });
});
