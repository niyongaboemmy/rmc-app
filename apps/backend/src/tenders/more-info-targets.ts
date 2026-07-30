/**
 * What a reviewer can ask a bidder to fix.
 *
 * When an admin requests more information they name the specific things that are
 * wrong; the bidder may then change ONLY those, and nothing else on the bid. This
 * file is the single vocabulary both sides speak — the admin's checkboxes, the
 * stored request, the server-side enforcement and the bidder's form all resolve
 * through it, so a group cannot mean one set of columns in the UI and another in
 * the service.
 */

/**
 * Field groups, not raw columns. A reviewer thinks "the address is wrong", not
 * "district_id, sector_id, cell and village are wrong", and asking them to tick
 * four boxes to say one thing invites half-ticked requests the bidder can't
 * satisfy.
 */
export enum TenderMoreInfoField {
  COMPANY = 'company',
  CONTACT = 'contact',
  PHONE = 'phone',
  EMAIL = 'email',
  ADDRESS = 'address',
  BID_AMOUNT = 'bid_amount',
  COVER_NOTE = 'cover_note',
}

/** Every group, in the order the admin picker lists them. */
export const TENDER_MORE_INFO_FIELDS: TenderMoreInfoField[] = [
  TenderMoreInfoField.COMPANY,
  TenderMoreInfoField.CONTACT,
  TenderMoreInfoField.PHONE,
  TenderMoreInfoField.EMAIL,
  TenderMoreInfoField.ADDRESS,
  TenderMoreInfoField.BID_AMOUNT,
  TenderMoreInfoField.COVER_NOTE,
];

/**
 * The bid columns each group unlocks. This mapping is what bounds a scoped edit:
 * anything not reachable from a requested group keeps its stored value, so a
 * bidder asked to fix their TIN cannot quietly restate their price.
 */
export const MORE_INFO_FIELD_COLUMNS: Record<TenderMoreInfoField, readonly string[]> = {
  [TenderMoreInfoField.COMPANY]: ['companyName', 'companyTin'],
  [TenderMoreInfoField.CONTACT]: ['contactName'],
  [TenderMoreInfoField.PHONE]: ['phone'],
  [TenderMoreInfoField.EMAIL]: ['email'],
  [TenderMoreInfoField.ADDRESS]: ['districtId', 'sectorId', 'cell', 'village'],
  [TenderMoreInfoField.BID_AMOUNT]: ['bidAmount'],
  [TenderMoreInfoField.COVER_NOTE]: ['coverNote'],
};

/** Flattened columns for a set of groups. */
export function columnsForFields(fields: readonly TenderMoreInfoField[]): Set<string> {
  const columns = new Set<string>();
  for (const field of fields) {
    for (const column of MORE_INFO_FIELD_COLUMNS[field] ?? []) columns.add(column);
  }
  return columns;
}
