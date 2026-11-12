import { addDays, diffDays, isDateKey, monthMatrix, startOfWeek, weekdayOf, shiftMonth, formatDateKey, toDateKey, daysInMonth } from '../src/utils/dates';

describe('dates (date-only values)', () => {
  test('addDays crosses months, years and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('DST transitions never shift a date', () => {
    // Europe/US DST change dates; arithmetic is done in UTC so a day is always a day.
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31);
    expect(diffDays('2026-10-20', '2026-11-10')).toBe(21);
  });

  test('toDateKey uses the local calendar date', () => {
    const d = new Date(2026, 10, 10, 23, 59);
    expect(toDateKey(d)).toBe('2026-11-10');
  });

  test('validates keys', () => {
    expect(isDateKey('2026-02-29')).toBe(false);
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(isDateKey('2026-13-01')).toBe(false);
    expect(isDateKey('2026-1-01')).toBe(false);
  });

  test('weeks start on Monday', () => {
    expect(weekdayOf('2026-11-10')).toBe(2); // Tuesday
    expect(startOfWeek('2026-11-10')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09'); // Sunday belongs to previous Monday
  });

  test('month matrix places days correctly', () => {
    const rows = monthMatrix(2026, 10); // November 2026 starts on Sunday
    expect(rows[0].slice(0, 6).every(c => c === null)).toBe(true);
    expect(rows[0][6]).toBe('2026-11-01');
    expect(rows.flat().filter(Boolean)).toHaveLength(30);
    expect(daysInMonth(2028, 1)).toBe(29);
  });

  test('shiftMonth wraps across years', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 });
    expect(shiftMonth(2026, 5, -18)).toEqual({ year: 2024, month0: 11 });
  });

  test('relative formatting', () => {
    expect(formatDateKey('2026-11-10', 'relative', '2026-11-10')).toBe('Today');
    expect(formatDateKey('2026-11-09', 'relative', '2026-11-10')).toBe('Yesterday');
    expect(formatDateKey('2026-11-01', 'medium', '2026-11-10')).toBe('Sun, 1 Nov');
    expect(formatDateKey('2025-11-01', 'medium', '2026-11-10')).toBe('Sat, 1 Nov 2025');
  });
});
