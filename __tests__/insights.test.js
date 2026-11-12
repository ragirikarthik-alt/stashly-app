import { summarize, currentStreak, longestStreak, trend, allocation, consistency, completionRate } from '../src/services/analytics';
import { estimateCompletion, requiredPace, simulate } from '../src/services/predictions';

let n = 0;
const tx = (goalId, type, amount, date) => ({ id: `t${++n}`, goalId, type, amount, date, createdAt: '2026-01-01T00:00:00Z', deletedAt: null });
const C = 'CONTRIBUTION';
const W = 'WITHDRAWAL';

describe('analytics', () => {
  const txs = [
    tx('a', C, 1000, '2026-11-10'),
    tx('a', C, 500, '2026-11-10'),
    tx('a', C, 2000, '2026-11-09'),
    tx('b', C, 3000, '2026-11-08'),
    tx('a', W, 700, '2026-11-08'),
    tx('b', C, 4000, '2026-11-01'),
  ];

  test('summary definitions', () => {
    const s = summarize(txs, { from: '2026-11-01', to: '2026-11-30' });
    expect(s.contributionTotal).toBe(10500);
    expect(s.withdrawalTotal).toBe(700);
    expect(s.net).toBe(9800);
    expect(s.activeDays).toBe(4);
    expect(s.averagePerActiveDay).toBe(2625); // ÷ active days, not calendar days
    expect(s.largestContribution.amount).toBe(4000);
    expect(s.entries).toBe(5);
    expect(s.withdrawals).toBe(1);
  });

  test('streaks: gentle about today, counts consecutive days', () => {
    expect(currentStreak(txs, '2026-11-10')).toBe(3);
    expect(currentStreak(txs, '2026-11-11')).toBe(3); // today not yet over
    expect(currentStreak(txs, '2026-11-12')).toBe(0);
    expect(longestStreak(txs)).toBe(3);
  });

  test('daily trend buckets match the ledger', () => {
    const b = trend(txs, 'daily', '2026-11-10');
    expect(b).toHaveLength(14);
    expect(b[13]).toMatchObject({ from: '2026-11-10', contrib: 1500, net: 1500 });
    expect(b.find(x => x.from === '2026-11-08')).toMatchObject({ contrib: 3000, withdraw: 700, net: 2300 });
    const total = b.reduce((s, x) => s + x.net, 0);
    expect(total).toBe(9800);
  });

  test('weekly and monthly trends', () => {
    const w = trend(txs, 'weekly', '2026-11-10');
    expect(w).toHaveLength(12);
    expect(w[11]).toMatchObject({ from: '2026-11-09', to: '2026-11-15', net: 3500 });
    const m = trend(txs, 'monthly', '2026-11-10');
    expect(m).toHaveLength(12);
    expect(m[11]).toMatchObject({ from: '2026-11-01', to: '2026-11-30', net: 9800 });
    expect(m[0].from).toBe('2025-12-01');
  });

  test('allocation separates contributions from balances', () => {
    const a = allocation([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], txs);
    expect(a.total).toBe(10500);
    expect(a.hasWithdrawals).toBe(true);
    const rowA = a.rows.find(r => r.goal.id === 'a');
    expect(rowA).toMatchObject({ contributed: 3500, withdrawn: 700, balance: 2800 });
  });

  test('consistency grid is neutral on empty days', () => {
    const c = consistency(txs, '2026-11-10', 4);
    expect(c.columns).toHaveLength(4);
    expect(c.activeDays).toBe(4);
    const all = c.columns.flat();
    expect(all.find(d => d.date === '2026-11-02').level).toBe(0);
    expect(all.find(d => d.date === '2026-11-11').future).toBe(true);
  });

  test('completion rate', () => {
    expect(completionRate([])).toBeNull();
    expect(completionRate([{ status: 'COMPLETED' }, { status: 'ACTIVE' }]).ratio).toBe(0.5);
  });
});

describe('predictions', () => {
  const goal = { id: 'g', targetAmount: 100000 };

  test('insufficient history → no confident date', () => {
    expect(estimateCompletion({ goal, balance: 0, transactions: [], today: '2026-11-10' }).status).toBe('insufficient');
    const one = [tx('g', C, 1000, '2026-11-10')];
    expect(estimateCompletion({ goal, balance: 1000, transactions: one, today: '2026-11-10' }).status).toBe('insufficient');
  });

  test('zero/negative recent pace → insufficient', () => {
    const t = [tx('g', C, 1000, '2026-11-01'), tx('g', C, 1000, '2026-11-02'), tx('g', W, 2000, '2026-11-03')];
    expect(estimateCompletion({ goal, balance: 0, transactions: t, today: '2026-11-10' }).status).toBe('insufficient');
  });

  test('calendar-day pace over the window', () => {
    // 30 days, ₹100/day on 10 days = 100000 paise net over a 30-day window
    const t = [];
    for (let d = 1; d <= 30; d += 3) {
      t.push(tx('g', C, 10000, `2026-11-${String(d).padStart(2, '0')}`));
    }
    const e = estimateCompletion({ goal: { id: 'g', targetAmount: 400000 }, balance: 100000, transactions: t, today: '2026-11-30' });
    expect(e.status).toBe('estimate');
    expect(e.window).toBe(30);
    // remaining 300000 at 100000/30 per day = 90 days
    expect(e.days).toBe(90);
    expect(e.date).toBe('2027-02-28');
  });

  test('reached', () => {
    expect(estimateCompletion({ goal, balance: 100000, transactions: [], today: '2026-11-10' }).status).toBe('reached');
  });

  test('required pace by target date', () => {
    const p = requiredPace({ remaining: 10000, today: '2026-11-10', targetDate: '2026-11-20' });
    expect(p).toMatchObject({ status: 'ok', days: 10, perDay: 1000, perWeek: 7000 });
    expect(requiredPace({ remaining: 1, today: '2026-11-10', targetDate: '2026-11-10' }).status).toBe('past');
    expect(requiredPace({ remaining: 1, today: '2026-11-10', targetDate: null })).toBeNull();
  });

  test('what-if simulator', () => {
    expect(simulate({ remaining: 10000, amount: 3000, period: 'day', today: '2026-11-10' })).toMatchObject({ periods: 4, days: 4, date: '2026-11-14' });
    expect(simulate({ remaining: 10000, amount: 3000, period: 'week', today: '2026-11-10' })).toMatchObject({ periods: 4, days: 28 });
    expect(simulate({ remaining: 10000, amount: 0, period: 'day', today: '2026-11-10' }).status).toBe('invalid');
  });
});
