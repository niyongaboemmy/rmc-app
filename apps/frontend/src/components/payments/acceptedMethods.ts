/**
 * What IremboPay's hosted sheet offers, shown before the payer commits.
 *
 * One list, because there is one gateway. This was duplicated — the donate cart
 * and the payment widget each hardcoded their own version, and they had already
 * drifted: 'Airtel' vs 'Airtel Money', 'Bank' vs 'Bank transfer', and 'USSD' vs
 * 'Digital banking' for the same channel. Two hardcoded claims about what a
 * third party accepts is exactly the drift that letting the gateway own the
 * choice was meant to avoid.
 *
 * The wording follows what the app's own copy already says — "MTN or Airtel
 * Money" and "Pay by card, bank or USSD" both appear in the message catalogue.
 *
 * These are labels, never controls. The payer picks inside IremboPay's sheet,
 * so a selector here could only go stale against it. The backend agrees: it
 * stores whatever channel the invoice comes back with (MTN_MOMO, AIRTEL_MONEY,
 * ONLINE_CARD, BK, …) as a free string rather than an enum, precisely because
 * the set is IremboPay's to change.
 *
 * Kept in English deliberately, as both call sites already had it: these are
 * brand names apart from "Bank transfer" and "USSD", which are the terms used
 * on the sheet itself.
 */
export interface AcceptedMethod {
  label: string;
  /** Brand dot, for the surfaces that show one. */
  dot: string;
  /** Offered for RWF invoices only. IremboPay pushes mobile money in RWF alone. */
  rwfOnly?: boolean;
}

export const ACCEPTED_METHODS: readonly AcceptedMethod[] = [
  { label: 'MTN MoMo', dot: 'bg-[#FFCC00]', rwfOnly: true },
  { label: 'Airtel Money', dot: 'bg-[#E4002B]', rwfOnly: true },
  { label: 'Visa', dot: 'bg-[#1A1F71]' },
  { label: 'Mastercard', dot: 'bg-[#EB001B]' },
  { label: 'Bank transfer', dot: 'bg-gray-400', rwfOnly: true },
  { label: 'USSD', dot: 'bg-gray-400', rwfOnly: true },
];

/**
 * The methods a payer can actually use for an invoice in `currency`. A USD or
 * EUR invoice is paid by card: listing MoMo there promises a channel the sheet
 * will not offer. Bank and USSD are listed as RWF-only too, until IremboPay
 * confirms they settle foreign-currency invoices.
 */
export function acceptedMethodsFor(currency = 'RWF'): readonly AcceptedMethod[] {
  return currency.toUpperCase() === 'RWF'
    ? ACCEPTED_METHODS
    : ACCEPTED_METHODS.filter((m) => !m.rwfOnly);
}

/** Just the names, for surfaces that render plain chips. */
export const ACCEPTED_METHOD_LABELS: readonly string[] = ACCEPTED_METHODS.map((m) => m.label);
