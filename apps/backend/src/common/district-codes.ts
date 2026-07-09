// Official Rwanda district codes (NISR ordering, 01–30). Shared by any
// service that embeds the district in a certificate/application number:
// RMC-<serviceCode>-<districtCode>-YYYYMM-NNNNN.
export const DISTRICT_CODES: Record<string, string> = {
  // Kigali City
  nyarugenge: '01',
  gasabo: '02',
  kicukiro: '03',
  // Southern Province
  nyanza: '04',
  gisagara: '05',
  nyaruguru: '06',
  huye: '07',
  nyamagabe: '08',
  ruhango: '09',
  muhanga: '10',
  kamonyi: '11',
  // Western Province
  karongi: '12',
  rutsiro: '13',
  rubavu: '14',
  nyabihu: '15',
  ngororero: '16',
  rusizi: '17',
  nyamasheke: '18',
  // Northern Province
  rulindo: '19',
  gakenke: '20',
  musanze: '21',
  burera: '22',
  gicumbi: '23',
  // Eastern Province
  rwamagana: '24',
  nyagatare: '25',
  gatsibo: '26',
  kayonza: '27',
  kirehe: '28',
  ngoma: '29',
  bugesera: '30',
};

/** District code (01–30) for a district name, or null if unrecognised. */
export function districtCode(district?: string | null): string | null {
  if (!district) return null;
  return DISTRICT_CODES[district.trim().toLowerCase()] ?? null;
}
