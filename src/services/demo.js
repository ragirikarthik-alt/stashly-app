/**
 * DEVELOPMENT/DEMO ONLY. Generates clearly-labelled sample goals so the UI can be
 * explored. Never loaded automatically; only reachable from a __DEV__ settings row.
 */
import { addDays } from '../utils/dates';
import { majorToMinor } from '../utils/money';
import { uuid } from '../utils/id';

export function buildDemoData(currency, today) {
  const now = new Date().toISOString();
  const mk = (name, target, category, priority, targetDays) => ({
    id: uuid(),
    name: `${name} (sample)`,
    targetAmount: majorToMinor(target, currency),
    currencyCode: currency,
    imageUri: null,
    productUrl: null,
    category,
    priority,
    targetDate: targetDays ? addDays(today, targetDays) : null,
    notes: 'Sample data for demo purposes',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
  });
  const goals = [
    mk('Headphones', 30000, 'Electronics', 'High', 90),
    mk('Goa trip', 45000, 'Travel', 'Medium', 150),
    mk('Camera', 65000, 'Electronics', 'Low', null),
    mk('Road bike', 22000, 'Vehicle', 'Medium', 60),
  ];
  const transactions = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const amounts = [100, 200, 250, 300, 500, 500, 750, 1000];
  for (let i = 75; i >= 0; i--) {
    const date = addDays(today, -i);
    if (rand() < 0.45) {
      continue;
    }
    const g = goals[Math.floor(rand() * goals.length)];
    const ts = new Date(Date.now() - i * 86400000).toISOString();
    transactions.push({
      id: uuid(),
      goalId: g.id,
      type: 'CONTRIBUTION',
      amount: majorToMinor(amounts[Math.floor(rand() * amounts.length)], currency),
      currencyCode: currency,
      date,
      note: null,
      source: 'demo',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    });
  }
  const balance1 = transactions.filter(t => t.goalId === goals[1].id).reduce((s, t) => s + t.amount, 0);
  if (balance1 < majorToMinor(200, currency)) {
    return { goals, transactions };
  }
  transactions.push({
    id: uuid(),
    goalId: goals[1].id,
    type: 'WITHDRAWAL',
    amount: majorToMinor(200, currency),
    currencyCode: currency,
    date: addDays(today, -3),
    note: 'Sample withdrawal',
    source: 'demo',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return { goals, transactions };
}
