/**
 * Transparent, clearly-labelled ESTIMATES based on recorded history.
 * Never a guarantee.
 */
import { TX } from './calculations';
import { addDays, diffDays } from '../utils/dates';
import { ceilDiv } from '../utils/money';

export const DEFAULT_WINDOW_DAYS = 30;
const MIN_WINDOW_DAYS = 7;
const MIN_ACTIVE_DAYS = 2;

/**
 * Calendar-day pace estimate.
 * Window = last 30 days, or since the goal's first entry if newer (min 7 days),
 * and every calendar day in the window counts, including days with no entries.
 */
export function estimateCompletion({ goal, balance, transactions, today, windowDays = DEFAULT_WINDOW_DAYS }) {
  const remaining = Math.max(goal.targetAmount - balance, 0);
  if (remaining === 0) {
    return { status: 'reached', remaining };
  }
  const goalTxs = transactions.filter(t => t.goalId === goal.id && !t.deletedAt && t.date <= today);
  if (!goalTxs.length) {
    return { status: 'insufficient', remaining, reason: 'No savings recorded yet' };
  }
  const firstDate = goalTxs.reduce((min, t) => (t.date < min ? t.date : min), goalTxs[0].date);
  const sinceFirst = diffDays(firstDate, today) + 1;
  const window = Math.max(Math.min(windowDays, sinceFirst), MIN_WINDOW_DAYS);
  const from = addDays(today, -(window - 1));

  let net = 0;
  const active = new Set();
  for (const t of goalTxs) {
    if (t.date < from) {
      continue;
    }
    if (t.type === TX.WITHDRAWAL) {
      net -= t.amount;
    } else {
      net += t.amount;
      active.add(t.date);
    }
  }
  if (net <= 0 || active.size < MIN_ACTIVE_DAYS) {
    return {
      status: 'insufficient',
      remaining,
      window,
      reason: 'Not enough recent saving activity to estimate',
    };
  }
  // ceil(remaining / (net / window)) == ceil(remaining * window / net) — integer-safe
  const days = ceilDiv(remaining * window, net);
  return {
    status: 'estimate',
    remaining,
    window,
    activeDays: active.size,
    netInWindow: net,
    dailyRate: net / window,
    days,
    date: addDays(today, days),
  };
}

/**
 * Amount needed per day / week to reach the goal by a target date.
 * `unit` rounds suggestions UP to a friendly increment (e.g. 100 = whole rupees).
 */
export function requiredPace({ remaining, today, targetDate, unit = 1 }) {
  const up = v => Math.ceil(v / unit) * unit;
  if (!targetDate) {
    return null;
  }
  const days = diffDays(today, targetDate);
  if (days <= 0) {
    return { status: 'past', days };
  }
  if (remaining <= 0) {
    return { status: 'reached', days };
  }
  return {
    status: 'ok',
    days,
    perDay: up(ceilDiv(remaining, days)),
    perWeek: up(days >= 7 ? ceilDiv(remaining * 7, days) : remaining),
  };
}

/** What-if: save `amount` every `period` ('day' | 'week'). */
export function simulate({ remaining, amount, period, today }) {
  if (remaining <= 0) {
    return { status: 'reached' };
  }
  if (!amount || amount <= 0) {
    return { status: 'invalid' };
  }
  const periods = ceilDiv(remaining, amount);
  const days = period === 'week' ? periods * 7 : periods;
  return { status: 'ok', periods, days, date: addDays(today, days) };
}

/** Suggested contribution for a new goal with a target date. */
export function suggestedContribution({ target, today, targetDate, unit = 1 }) {
  const pace = requiredPace({ remaining: target, today, targetDate, unit });
  if (!pace || pace.status !== 'ok') {
    return null;
  }
  return pace;
}
