/**
 * Money helpers. All amounts are stored and computed as INTEGER MINOR UNITS
 * (e.g. paise for INR). Never use floating point for money arithmetic.
 */

export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, grouping: 'indian', steps: [10, 100, 500] },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, grouping: 'western', steps: [1, 10, 50] },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, grouping: 'western', steps: [1, 10, 50] },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, grouping: 'western', steps: [1, 10, 50] },
  AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', decimals: 2, grouping: 'western', steps: [5, 50, 100] },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, grouping: 'western', steps: [1, 10, 50] },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, grouping: 'western', steps: [1, 10, 50] },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, grouping: 'western', steps: [1, 10, 50] },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, grouping: 'western', steps: [100, 1000, 5000] },
};

export const DEFAULT_CURRENCY = 'INR';

/** Hard upper bound to prevent overflow / absurd input (well within Number.MAX_SAFE_INTEGER). */
export const MAX_MINOR = 1e13;

export function getCurrency(code) {
  return CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
}

export function minorFactor(code) {
  return 10 ** getCurrency(code).decimals;
}

/** Convert a whole major-unit integer (e.g. 500 rupees) to minor units. */
export function majorToMinor(major, code) {
  return Math.round(major) * minorFactor(code);
}

/** Increment steps (in minor units) for the Savings Dial. */
export function dialSteps(code) {
  return getCurrency(code).steps.map(s => majorToMinor(s, code));
}

function groupDigits(intStr, grouping) {
  if (intStr.length <= 3) {
    return intStr;
  }
  if (grouping === 'indian') {
    const last3 = intStr.slice(-3);
    let rest = intStr.slice(0, -3);
    const parts = [];
    while (rest.length > 2) {
      parts.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) {
      parts.unshift(rest);
    }
    return parts.join(',') + ',' + last3;
  }
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format integer minor units.
 * options.decimals: 'auto' (only when non-zero), 'always', 'never'
 * options.sign: prefix '+' for positive values
 * options.symbol: include currency symbol (default true)
 * options.compact: 1.2L / 3.4Cr (INR) or 1.2K / 3.4M style for charts
 */
export function formatMoney(minor, code = DEFAULT_CURRENCY, options = {}) {
  const { decimals = 'auto', sign = false, symbol = true, compact = false } = options;
  const cur = getCurrency(code);
  const value = Number.isFinite(minor) ? Math.trunc(minor) : 0;
  const negative = value < 0;
  const abs = Math.abs(value);
  const factor = 10 ** cur.decimals;
  const intPart = Math.floor(abs / factor);
  const fracPart = abs % factor;

  let body;
  if (compact && intPart >= 1000) {
    body = compactNumber(intPart, cur.grouping);
  } else {
    body = groupDigits(String(intPart), cur.grouping);
    const showFrac =
      cur.decimals > 0 && (decimals === 'always' || (decimals === 'auto' && fracPart !== 0));
    if (showFrac) {
      body += '.' + String(fracPart).padStart(cur.decimals, '0');
    }
  }
  const prefix = negative ? '−' : sign && value > 0 ? '+' : '';
  return prefix + (symbol ? cur.symbol : '') + body;
}

function compactNumber(n, grouping) {
  const fmt = (v, suffix) => {
    const s = v >= 100 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString();
    return s.replace(/\.0$/, '') + suffix;
  };
  if (grouping === 'indian') {
    if (n >= 1e7) {
      return fmt(n / 1e7, 'Cr');
    }
    if (n >= 1e5) {
      return fmt(n / 1e5, 'L');
    }
    return fmt(n / 1e3, 'K');
  }
  if (n >= 1e9) {
    return fmt(n / 1e9, 'B');
  }
  if (n >= 1e6) {
    return fmt(n / 1e6, 'M');
  }
  return fmt(n / 1e3, 'K');
}

/**
 * Parse user-entered text to integer minor units without floating point.
 * Returns { ok: true, value } or { ok: false, error }.
 */
export function parseAmount(text, code = DEFAULT_CURRENCY) {
  const cur = getCurrency(code);
  const cleaned = String(text ?? '')
    .replace(/[,\s]/g, '')
    .replace(cur.symbol.trim(), '');
  if (cleaned === '' || cleaned === '.') {
    return { ok: false, error: 'Enter an amount' };
  }
  const re =
    cur.decimals > 0 ? new RegExp(`^\\d{0,13}(\\.\\d{0,${cur.decimals}})?$`) : /^\d{0,13}$/;
  if (!re.test(cleaned)) {
    return {
      ok: false,
      error: cur.decimals > 0 ? `Use up to ${cur.decimals} decimal places` : 'Use whole numbers only',
    };
  }
  const [intStr = '0', fracStr = ''] = cleaned.split('.');
  const factor = 10 ** cur.decimals;
  const intVal = parseInt(intStr || '0', 10);
  const fracVal =
    cur.decimals > 0
      ? parseInt((fracStr + '0'.repeat(cur.decimals)).slice(0, cur.decimals), 10)
      : 0;
  const value = intVal * factor + fracVal;
  if (!Number.isSafeInteger(value) || value > MAX_MINOR) {
    return { ok: false, error: 'That amount is too large' };
  }
  return { ok: true, value };
}

/** Minor units → plain editable string ("1500", "1500.5"). */
export function minorToInput(minor, code = DEFAULT_CURRENCY) {
  const cur = getCurrency(code);
  const factor = 10 ** cur.decimals;
  const intPart = Math.floor(Math.abs(minor) / factor);
  const frac = Math.abs(minor) % factor;
  if (!frac) {
    return String(intPart);
  }
  return `${intPart}.${String(frac).padStart(cur.decimals, '0').replace(/0+$/, '')}`;
}

/** Integer-safe ceil division for non-negative integers. */
export function ceilDiv(a, b) {
  if (b <= 0) {
    return Infinity;
  }
  return Math.floor((a + b - 1) / b);
}
