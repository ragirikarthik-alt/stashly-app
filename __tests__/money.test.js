import { formatMoney, parseAmount, minorToInput, dialSteps, majorToMinor, ceilDiv, MAX_MINOR } from '../src/utils/money';

describe('money', () => {
  test('formats INR with Indian grouping, whole rupees by default', () => {
    expect(formatMoney(0, 'INR')).toBe('₹0');
    expect(formatMoney(50000, 'INR')).toBe('₹500');
    expect(formatMoney(12345678900, 'INR')).toBe('₹12,34,56,789');
    expect(formatMoney(150050, 'INR')).toBe('₹1,500.50');
    expect(formatMoney(150000, 'INR', { decimals: 'always' })).toBe('₹1,500.00');
  });

  test('formats western grouping, signs and compact', () => {
    expect(formatMoney(123456789, 'USD')).toBe('$1,234,567.89');
    expect(formatMoney(-5000, 'USD')).toBe('−$50');
    expect(formatMoney(5000, 'USD', { sign: true })).toBe('+$50');
    expect(formatMoney(15000000, 'INR', { compact: true })).toBe('₹1.5L');
    expect(formatMoney(250000000, 'USD', { compact: true })).toBe('$2.5M');
    expect(formatMoney(1500, 'JPY')).toBe('¥1,500');
  });

  test('parses without floating point error', () => {
    expect(parseAmount('0.1', 'INR')).toEqual({ ok: true, value: 10 });
    expect(parseAmount('0.29', 'INR')).toEqual({ ok: true, value: 29 }); // 0.29*100 = 28.999… in float
    expect(parseAmount('1,500.5', 'INR')).toEqual({ ok: true, value: 150050 });
    expect(parseAmount('1500', 'JPY')).toEqual({ ok: true, value: 1500 });
  });

  test('rejects malformed, over-precise and overflowing input', () => {
    expect(parseAmount('', 'INR').ok).toBe(false);
    expect(parseAmount('abc', 'INR').ok).toBe(false);
    expect(parseAmount('1.234', 'INR').ok).toBe(false);
    expect(parseAmount('1.5', 'JPY').ok).toBe(false);
    expect(parseAmount('-5', 'INR').ok).toBe(false);
    expect(parseAmount('99999999999999', 'INR').ok).toBe(false);
    expect(MAX_MINOR).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });

  test('round trips editable input', () => {
    expect(minorToInput(150050, 'INR')).toBe('1500.5');
    expect(minorToInput(150000, 'INR')).toBe('1500');
    expect(parseAmount(minorToInput(98765, 'INR'), 'INR').value).toBe(98765);
  });

  test('dial steps are in minor units', () => {
    expect(dialSteps('INR')).toEqual([1000, 10000, 50000]);
    expect(majorToMinor(500, 'INR')).toBe(50000);
    expect(dialSteps('JPY')).toEqual([100, 1000, 5000]);
  });

  test('ceilDiv', () => {
    expect(ceilDiv(10, 3)).toBe(4);
    expect(ceilDiv(9, 3)).toBe(3);
    expect(ceilDiv(0, 3)).toBe(0);
    expect(ceilDiv(5, 0)).toBe(Infinity);
  });
});
