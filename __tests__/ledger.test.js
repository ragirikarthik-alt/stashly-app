import {
  goalBalance,
  buildGoalStats,
  deriveStatus,
  activeSavingsTotal,
  lifetimeBalance,
  dailyTotals,
  remainingAmount,
  progressPercent,
  wouldGoNegative,
} from '../src/services/calculations';
import { computeAchievedKeys } from '../src/services/milestones';

const goal = (id, target, status = 'ACTIVE') => ({ id, name: id, targetAmount: target, status, currencyCode: 'INR' });
let n = 0;
const tx = (goalId, type, amount, date, extra = {}) => ({
  id: `t${++n}`,
  goalId,
  type,
  amount,
  date,
  createdAt: `2026-11-10T10:00:0${n % 10}.000Z`,
  deletedAt: null,
  ...extra,
});

describe('ledger', () => {
  const g1 = goal('g1', 100000);
  const g2 = goal('g2', 50000, 'ARCHIVED');
  const txs = [
    tx('g1', 'CONTRIBUTION', 30000, '2026-11-01'),
    tx('g1', 'CONTRIBUTION', 20000, '2026-11-01'), // multiple entries on one day
    tx('g1', 'WITHDRAWAL', 5000, '2026-11-02'),
    tx('g1', 'CONTRIBUTION', 99999, '2026-11-03', { deletedAt: '2026-11-03T00:00:00Z' }), // soft-deleted
    tx('g2', 'CONTRIBUTION', 50000, '2026-10-01'),
  ];

  test('balance = contributions − withdrawals, ignoring deleted rows', () => {
    expect(goalBalance('g1', txs)).toBe(45000);
    expect(remainingAmount(g1.targetAmount, 45000)).toBe(55000);
    expect(progressPercent(g1.targetAmount, 45000)).toBe(45);
  });

  test('stats keep raw balance above target while ratio caps at 1', () => {
    const s = buildGoalStats([goal('x', 1000)], [tx('x', 'CONTRIBUTION', 1500, '2026-11-01')]).get('x');
    expect(s.balance).toBe(1500);
    expect(s.ratio).toBe(1);
    expect(s.percent).toBe(100);
    expect(s.overTarget).toBe(500);
    expect(s.remaining).toBe(0);
  });

  test('status follows the ledger; archive is sticky', () => {
    expect(deriveStatus(goal('a', 100), 100)).toBe('COMPLETED');
    expect(deriveStatus(goal('a', 100, 'COMPLETED'), 99)).toBe('ACTIVE'); // withdrawal below target
    expect(deriveStatus(goal('a', 100, 'ARCHIVED'), 500)).toBe('ARCHIVED');
  });

  test('home total excludes archived goals; lifetime includes them', () => {
    const stats = buildGoalStats([g1, g2], txs);
    expect(activeSavingsTotal([g1, g2], stats)).toBe(45000);
    expect(lifetimeBalance([g1, g2], stats)).toBe(95000);
  });

  test('daily totals net contributions and withdrawals per date', () => {
    const d = dailyTotals(txs);
    expect(d.get('2026-11-01')).toMatchObject({ contrib: 50000, withdraw: 0, net: 50000, count: 2 });
    expect(d.get('2026-11-02')).toMatchObject({ contrib: 0, withdraw: 5000, net: -5000 });
    expect(d.has('2026-11-03')).toBe(false);
  });

  test('withdrawals cannot exceed the balance', () => {
    expect(wouldGoNegative('g1', txs, { type: 'WITHDRAWAL', amount: 45001 })).toBe(true);
    expect(wouldGoNegative('g1', txs, { type: 'WITHDRAWAL', amount: 45000 })).toBe(false);
  });

  test('milestones are derived from the ledger', () => {
    const stats = buildGoalStats([g1, g2], txs);
    const keys = computeAchievedKeys([g1, g2], txs, stats, 'INR');
    expect(keys).toEqual(expect.arrayContaining(['first_contribution', 'first_goal', 'goal:g1:25', 'goal:g2:100']));
    expect(keys).not.toContain('goal:g1:50');
    expect(keys).not.toContain('first_1000'); // 95000 paise = ₹950 net, below ₹1,000
    const more = [...txs, tx('g1', 'CONTRIBUTION', 5000, '2026-11-04')];
    expect(computeAchievedKeys([g1, g2], more, buildGoalStats([g1, g2], more), 'INR')).toContain('first_1000');
  });
});
