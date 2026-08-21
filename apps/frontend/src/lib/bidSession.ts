/**
 * Where the verified OTP tracking token lives between the status card and the
 * bid page it navigates to.
 *
 * sessionStorage, not localStorage or a URL: the token is a live credential for
 * reading and EDITING a bid, so it should not survive the tab that earned it, and
 * it must never end up in browser history, a shared link or a referrer header.
 * It is short-lived anyway — the backend mints it for 15 minutes — so a lapsed
 * session simply sends the bidder back through the OTP gate.
 */
const KEY = 'rmc_tender_bid_session';

export function storeBidSession(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KEY, token);
}

export function readBidSession(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(KEY);
}

export function clearBidSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY);
}
