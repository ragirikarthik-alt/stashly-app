/**
 * Optional, restrained positive reinforcement. Badges have no monetary value.
 * A milestone, once reached, is kept (later withdrawals don't revoke it).
 */
import { TX } from './calculations';
import { diffDays } from '../utils/dates';
import { majorToMinor, formatMoney } from '../utils/money';

export const GOAL_THRESHOLDS = [25, 50, 75, 100];

export function milestoneCatalog(currency) {
  return [
    { key: 'first_contribution', title: 'First step', description: 'Recorded your first contribution', icon: 'sprout' },
    {
      key: 'first_1000',
      title: `First ${formatMoney(majorToMinor(1000, currency), currency)}`,
      description: `Saved ${formatMoney(majorToMinor(1000, currency), currency)} in total`,
      icon: 'coins',
    },
    { key: 'seven_days', title: 'Seven saving days', description: 'Saved on 7 different days', icon: 'calendar-check' },
    { key: 'one_month', title: 'A month of saving', description: 'Kept recording savings for a month', icon: 'calendar-heart' },
    { key: 'first_goal', title: 'Goal reached', description: 'Completed your first goal', icon: 'trophy' },
  ];
}

/** Every milestone key currently satisfied by the ledger. */
export function computeAchievedKeys(goals, transactions, stats, currency) {
  const keys = [];
  const live = transactions.filter(t => !t.deletedAt);
  const contribs = live.filter(t => t.type === TX.CONTRIBUTION);
  if (contribs.length) {
    keys.push('first_contribution');
  }
  let net = 0;
  for (const t of live) {
    net += t.type === TX.WITHDRAWAL ? -t.amount : t.amount;
  }
  if (net >= majorToMinor(1000, currency)) {
    keys.push('first_1000');
  }
  const days = new Set(contribs.map(t => t.date));
  if (days.size >= 7) {
    keys.push('seven_days');
  }
  if (contribs.length) {
    const sorted = [...days].sort();
    if (diffDays(sorted[0], sorted[sorted.length - 1]) >= 29) {
      keys.push('one_month');
    }
  }
  let anyComplete = false;
  for (const g of goals) {
    const s = stats.get(g.id);
    if (!s) {
      continue;
    }
    const pct = g.targetAmount > 0 ? (s.balance * 100) / g.targetAmount : 0;
    for (const th of GOAL_THRESHOLDS) {
      if (pct >= th) {
        keys.push(`goal:${g.id}:${th}`);
      }
    }
    if (s.balance >= g.targetAmount || g.completedAt) {
      anyComplete = true;
    }
  }
  if (anyComplete) {
    keys.push('first_goal');
  }
  return keys;
}

export function describeMilestone(key, goals, currency) {
  if (key.startsWith('goal:')) {
    const [, goalId, th] = key.split(':');
    const goal = goals.find(g => g.id === goalId);
    return {
      key,
      title: `${th}% of ${goal ? goal.name : 'a goal'}`,
      description: th === '100' ? 'Target reached' : `You're ${th}% of the way there`,
      icon: th === '100' ? 'trophy' : 'flag',
      goalId,
    };
  }
  return milestoneCatalog(currency).find(m => m.key === key) || { key, title: key, description: '', icon: 'star' };
}
