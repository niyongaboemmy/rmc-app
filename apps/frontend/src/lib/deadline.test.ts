import { readDeadline, getLifecycle } from './deadline';

// Every interesting case sits on a calendar boundary, so pin the clock rather
// than let the result depend on what time the suite runs.
const NOW = new Date(2026, 7, 3, 10, 0, 0); // Mon 3 Aug 2026, 10:00 local

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

/** A local wall-clock moment relative to the pinned "now". */
const at = (dayOffset: number, hour = 10) =>
  new Date(2026, 7, 3 + dayOffset, hour, 0, 0).toISOString();

describe('readDeadline', () => {
  it('reports no deadline for null', () => {
    expect(readDeadline(null)).toEqual({ state: 'none', days: null, closed: false });
  });

  it('treats an unparseable value as no deadline rather than closed', () => {
    expect(readDeadline('not-a-date').closed).toBe(false);
    expect(readDeadline('not-a-date').state).toBe('none');
  });

  it('is "today" for a deadline later the same day', () => {
    expect(readDeadline(at(0, 23))).toEqual({ state: 'today', days: 0, closed: false });
  });

  it('is closed for a deadline that lapsed earlier the same day', () => {
    // The old ceil rule reported 0 here, which every board rendered as
    // "Closes today" — hours after the backend had begun rejecting bids.
    const d = readDeadline(at(0, 9));
    expect(d.closed).toBe(true);
    expect(d.state).toBe('closed');
  });

  it('is closed at the exact deadline moment', () => {
    expect(readDeadline(at(0, 10)).closed).toBe(true);
  });

  it('is "tomorrow" for the next calendar day, however few hours away', () => {
    // Three hours out, but a different date.
    expect(readDeadline(at(1, 13))).toEqual({ state: 'tomorrow', days: 1, closed: false });
  });

  it('counts calendar days, not elapsed hours', () => {
    // 4 days 23 hours away. Ceiling the raw gap would also say 5 here...
    expect(readDeadline(at(5, 9)).days).toBe(5);
    // ...but 5 days 1 hour away, which ceil would round up to 6.
    expect(readDeadline(at(5, 11)).days).toBe(5);
  });

  it('keeps a negative day count for a date already past', () => {
    const d = readDeadline(at(-3));
    expect(d.closed).toBe(true);
    expect(d.days).toBe(-3);
  });
});

describe('getLifecycle', () => {
  it('is open with no deadline', () => {
    expect(getLifecycle(null)).toBe('open');
  });

  it('is open beyond a week', () => {
    expect(getLifecycle(at(8))).toBe('open');
  });

  it('is closing inside a week', () => {
    expect(getLifecycle(at(7))).toBe('closing');
    expect(getLifecycle(at(1))).toBe('closing');
  });

  it('is closing on the last day, right up to the deadline', () => {
    expect(getLifecycle(at(0, 23))).toBe('closing');
  });

  it('is closed once the moment passes, not at midnight', () => {
    expect(getLifecycle(at(0, 9))).toBe('closed');
  });

  it('honours a custom closing window', () => {
    expect(getLifecycle(at(10), 14)).toBe('closing');
    expect(getLifecycle(at(20), 14)).toBe('open');
  });
});
