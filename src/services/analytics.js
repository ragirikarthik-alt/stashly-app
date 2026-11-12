/**
 * Insights. Definitions (shown to the user in the app as well):
 *  - Contribution total: sum of positive contributions in range.
 *  - Withdrawal total: sum of withdrawals in range (positive magnitude).
 *  - Net savings change: contributions − withdrawals.
 *  - Active saving day: a local date with ≥ 1 contribution.
 *  - Average per active day: contribution total ÷ active saving days.
 *  - Current streak: consecutive local days with ≥ 1 contribution, ending today
 *    (or yesterday, so today isn't counted against you before it is over).
 */
import { TX, STATUS, dailyTotals } from './calculations';
import {
  addDays,
  diffDays,
  startOfWeek,
  MONTHS_SHORT,
  splitKey,
  shiftMonth,
  firstOfMonth,
  daysInMonth,
  WEEKDAYS_SHORT,
  weekdayOf,
} from '../utils/dates';

const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);

export function summarize(transactions, { from, to } = {}) {
  let contributionTotal = 0;
  let withdrawalTotal = 0;
  let largestContribution = null;
  let entries = 0;
  let withdrawals = 0;
  const activeDays = new Set();
  for (const t of transactions) {
    if (t.deletedAt || !inRange(t.date, from, to)) {
      continue;
    }
    if (t.type === TX.WITHDRAWAL) {
      withdrawalTotal += t.amount;
      withdrawals += 1;
    } else {
      contributionTotal += t.amount;
      entries += 1;
      activeDays.add(t.date);
      if (!largestContribution || t.amount > largestContribution.amount) {
        largestContribution = t;
      }
    }
  }
  const activeDayCount = activeDays.size;
  return {
    contributionTotal,
    withdrawalTotal,
    net: contributionTotal - withdrawalTotal,
    activeDays: activeDayCount,
    averagePerActiveDay: activeDayCount ? Math.round(contributionTotal / activeDayCount) : 0,
    largestContribution,
    entries,
    withdrawals,
  };
}

export function currentStreak(transactions, today) {
  const days = new Set();
  for (const t of transactions) {
    if (!t.deletedAt && t.type === TX.CONTRIBUTION) {
      days.add(t.date);
    }
  }
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(transactions) {
  const days = [
    ...new Set(transactions.filter(t => !t.deletedAt && t.type === TX.CONTRIBUTION).map(t => t.date)),
  ].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/**
 * Trend buckets.
 *  daily   → last 14 days
 *  weekly  → last 12 weeks (Mon–Sun)
 *  monthly → last 12 months
 */
export function trend(transactions, range, today) {
  const buckets = [];
  if (range === 'daily') {
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      const { d: day } = splitKey(d);
      buckets.push({
        key: d,
        from: d,
        to: d,
        label: i === 0 ? 'Today' : String(day),
        axis: WEEKDAYS_SHORT[weekdayOf(d)][0],
      });
    }
  } else if (range === 'weekly') {
    const thisWeek = startOfWeek(today);
    for (let i = 11; i >= 0; i--) {
      const from = addDays(thisWeek, -7 * i);
      const to = addDays(from, 6);
      const { m, d } = splitKey(from);
      buckets.push({ key: from, from, to, label: `Week of ${d} ${MONTHS_SHORT[m - 1]}`, axis: `${d}/${m}` });
    }
  } else {
    const { y, m } = splitKey(today);
    for (let i = 11; i >= 0; i--) {
      const { year, month0 } = shiftMonth(y, m - 1, -i);
      const from = firstOfMonth(year, month0);
      const to = addDays(from, daysInMonth(year, month0) - 1);
      buckets.push({
        key: from,
        from,
        to,
        label: `${MONTHS_SHORT[month0]} ${year}`,
        axis: MONTHS_SHORT[month0][0],
      });
    }
  }
  const first = buckets[0].from;
  const last = buckets[buckets.length - 1].to;
  for (const b of buckets) {
    b.contrib = 0;
    b.withdraw = 0;
  }
  for (const t of transactions) {
    if (t.deletedAt || t.date < first || t.date > last) {
      continue;
    }
    // buckets are sorted; linear scan is fine for ≤ 14 buckets
    const b = buckets.find(x => t.date >= x.from && t.date <= x.to);
    if (!b) {
      continue;
    }
    if (t.type === TX.WITHDRAWAL) {
      b.withdraw += t.amount;
    } else {
      b.contrib += t.amount;
    }
  }
  for (const b of buckets) {
    b.net = b.contrib - b.withdraw;
  }
  return buckets;
}

/** Contribution totals vs current balances per goal. */
export function allocation(goals, transactions) {
  const byGoal = new Map(goals.map(g => [g.id, { goal: g, contributed: 0, withdrawn: 0 }]));
  for (const t of transactions) {
    if (t.deletedAt) {
      continue;
    }
    const row = byGoal.get(t.goalId);
    if (!row) {
      continue;
    }
    if (t.type === TX.WITHDRAWAL) {
      row.withdrawn += t.amount;
    } else {
      row.contributed += t.amount;
    }
  }
  const rows = [...byGoal.values()]
    .map(r => ({ ...r, balance: r.contributed - r.withdrawn }))
    .filter(r => r.contributed > 0)
    .sort((a, b) => b.contributed - a.contributed);
  const total = rows.reduce((s, r) => s + r.contributed, 0);
  return { rows, total, hasWithdrawals: rows.some(r => r.withdrawn > 0) };
}

/**
 * Consistency heatmap: `weeks` columns (Mon–Sun) ending with the current week.
 * level: 0 none (neutral), 1–4 relative contribution size.
 */
export function consistency(transactions, today, weeks = 16) {
  const daily = dailyTotals(transactions);
  const start = addDays(startOfWeek(today), -7 * (weeks - 1));
  const values = [];
  for (const [date, d] of daily) {
    if (date >= start && date <= today && d.contrib > 0) {
      values.push(d.contrib);
    }
  }
  values.sort((a, b) => a - b);
  const q = p => (values.length ? values[Math.min(values.length - 1, Math.floor(p * values.length))] : 0);
  const t1 = q(0.25);
  const t2 = q(0.5);
  const t3 = q(0.75);
  const columns = [];
  let activeDays = 0;
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, w * 7 + i);
      const contrib = daily.get(date)?.contrib ?? 0;
      let level = 0;
      if (contrib > 0) {
        activeDays += 1;
        level = contrib <= t1 ? 1 : contrib <= t2 ? 2 : contrib <= t3 ? 3 : 4;
      }
      col.push({ date, contrib, level, future: date > today });
    }
    columns.push(col);
  }
  return { columns, activeDays, start };
}

export function completionRate(goals) {
  if (!goals.length) {
    return null;
  }
  const done = goals.filter(g => g.status === STATUS.COMPLETED || g.completedAt).length;
  return { done, total: goals.length, ratio: done / goals.length };
}
