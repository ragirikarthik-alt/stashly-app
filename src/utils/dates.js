/**
 * Date helpers. Transaction dates are DATE-ONLY strings ("YYYY-MM-DD") in the
 * user's local calendar. Timestamps are ISO UTC strings. The two are never mixed.
 * Calendar arithmetic goes through UTC so DST and timezone changes can never
 * shift a date-only value.
 */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Monday-first single-letter labels for grids. */
export const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const pad = n => String(n).padStart(2, '0');

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(now = new Date()) {
  return toDateKey(now);
}

export function nowIso() {
  return new Date().toISOString();
}

export function splitKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

export function isDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return false;
  }
  const { y, m, d } = splitKey(key);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(key, n) {
  const { y, m, d } = splitKey(key);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function diffDays(fromKey, toKey) {
  const a = splitKey(fromKey);
  const b = splitKey(toKey);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

/** 0 = Sunday */
export function weekdayOf(key) {
  const { y, m, d } = splitKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function monthKey(key) {
  return key.slice(0, 7);
}

export function daysInMonth(year, month0) {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

export function firstOfMonth(year, month0) {
  return `${year}-${pad(month0 + 1)}-01`;
}

export function shiftMonth(year, month0, delta) {
  const total = year * 12 + month0 + delta;
  return { year: Math.floor(total / 12), month0: ((total % 12) + 12) % 12 };
}

/** Monday of the week containing key. */
export function startOfWeek(key) {
  const wd = weekdayOf(key);
  return addDays(key, -((wd + 6) % 7));
}

/** Monday-first week rows for a month grid. Cells outside the month are null. */
export function monthMatrix(year, month0) {
  const first = firstOfMonth(year, month0);
  const lead = (weekdayOf(first) + 6) % 7;
  const count = daysInMonth(year, month0);
  const cells = [];
  for (let i = 0; i < lead; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= count; d++) {
    cells.push(`${year}-${pad(month0 + 1)}-${pad(d)}`);
  }
  while (cells.length % 7) {
    cells.push(null);
  }
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function monthDays(year, month0) {
  const count = daysInMonth(year, month0);
  const out = [];
  for (let d = 1; d <= count; d++) {
    out.push(`${year}-${pad(month0 + 1)}-${pad(d)}`);
  }
  return out;
}

export function formatDateKey(key, style = 'medium', today = todayKey()) {
  if (!key) {
    return '';
  }
  const { y, m, d } = splitKey(key);
  const wd = WEEKDAYS_SHORT[weekdayOf(key)];
  if (style === 'relative') {
    const diff = diffDays(today, key);
    if (diff === 0) {
      return 'Today';
    }
    if (diff === -1) {
      return 'Yesterday';
    }
    if (diff === 1) {
      return 'Tomorrow';
    }
    style = 'medium';
  }
  const curYear = splitKey(today).y;
  switch (style) {
    case 'short':
      return `${d} ${MONTHS_SHORT[m - 1]}`;
    case 'long':
      return `${wd}, ${d} ${MONTHS[m - 1]} ${y}`;
    case 'month':
      return `${MONTHS[m - 1]} ${y}`;
    case 'full':
      return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
    case 'medium':
    default:
      return `${wd}, ${d} ${MONTHS_SHORT[m - 1]}${y !== curYear ? ' ' + y : ''}`;
  }
}

export function formatTime(iso) {
  if (!iso) {
    return '';
  }
  const dt = new Date(iso);
  let h = dt.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${pad(dt.getMinutes())} ${ampm}`;
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) {
    return 'Good evening';
  }
  if (h < 12) {
    return 'Good morning';
  }
  if (h < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}
