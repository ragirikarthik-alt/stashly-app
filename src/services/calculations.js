/**
 * Core ledger calculations. Goal balances are ALWAYS derived from transactions;
 * there is no editable "savedAmount" field anywhere.
 * All money values are integer minor units.
 */

export const TX = { CONTRIBUTION: 'CONTRIBUTION', WITHDRAWAL: 'WITHDRAWAL' };
export const STATUS = { ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED', ARCHIVED: 'ARCHIVED' };

export const signedAmount = tx => (tx.type === TX.WITHDRAWAL ? -tx.amount : tx.amount);

const live = txs => txs.filter(t => !t.deletedAt);

/** goalBalance = sum(CONTRIBUTION) - sum(WITHDRAWAL) */
export function goalBalance(goalId, txs) {
  let b = 0;
  for (const t of txs) {
    if (t.goalId === goalId && !t.deletedAt) {
      b += signedAmount(t);
    }
  }
  return b;
}

export function remainingAmount(target, balance) {
  return Math.max(target - balance, 0);
}

/** Fraction 0..1 (display only, capped). */
export function progressRatio(target, balance) {
  if (target <= 0) {
    return 0;
  }
  return Math.min(Math.max(balance, 0) / target, 1);
}

export function progressPercent(target, balance) {
  return Math.floor(progressRatio(target, balance) * 100);
}

/** Stats for every goal, keyed by goal id. */
export function buildGoalStats(goals, transactions) {
  const map = new Map();
  for (const g of goals) {
    map.set(g.id, {
      balance: 0,
      contributed: 0,
      withdrawn: 0,
      txCount: 0,
      lastDate: null,
      firstDate: null,
    });
  }
  for (const t of live(transactions)) {
    const s = map.get(t.goalId);
    if (!s) {
      continue;
    }
    if (t.type === TX.WITHDRAWAL) {
      s.withdrawn += t.amount;
      s.balance -= t.amount;
    } else {
      s.contributed += t.amount;
      s.balance += t.amount;
    }
    s.txCount += 1;
    if (!s.lastDate || t.date > s.lastDate) {
      s.lastDate = t.date;
    }
    if (!s.firstDate || t.date < s.firstDate) {
      s.firstDate = t.date;
    }
  }
  for (const g of goals) {
    const s = map.get(g.id);
    s.remaining = remainingAmount(g.targetAmount, s.balance);
    s.ratio = progressRatio(g.targetAmount, s.balance);
    s.percent = progressPercent(g.targetAmount, s.balance);
    s.reached = s.balance >= g.targetAmount;
    s.overTarget = Math.max(s.balance - g.targetAmount, 0);
  }
  return map;
}

/** Lifecycle status implied by the ledger (archived is a user choice and sticks). */
export function deriveStatus(goal, balance) {
  if (goal.status === STATUS.ARCHIVED) {
    return STATUS.ARCHIVED;
  }
  return balance >= goal.targetAmount ? STATUS.COMPLETED : STATUS.ACTIVE;
}

export const isVisibleGoal = g => g.status !== STATUS.ARCHIVED;

/** Home total: balances of non-archived goals (active + completed). */
export function activeSavingsTotal(goals, stats) {
  let total = 0;
  for (const g of goals) {
    if (isVisibleGoal(g)) {
      total += stats.get(g.id)?.balance ?? 0;
    }
  }
  return total;
}

/** Lifetime balance including archived goals. */
export function lifetimeBalance(goals, stats) {
  let total = 0;
  for (const g of goals) {
    total += stats.get(g.id)?.balance ?? 0;
  }
  return total;
}

/**
 * Validate that applying a change keeps the goal balance >= 0.
 * `excludeTxId` lets an edit be validated against the ledger without itself.
 */
export function wouldGoNegative(goalId, txs, change, excludeTxId) {
  const others = txs.filter(t => t.id !== excludeTxId);
  const balance = goalBalance(goalId, others);
  return balance + signedAmount(change) < 0;
}

/** Per-date aggregates: Map<dateKey, {contrib, withdraw, net, count, entries}> */
export function dailyTotals(transactions) {
  const map = new Map();
  for (const t of live(transactions)) {
    let d = map.get(t.date);
    if (!d) {
      d = { contrib: 0, withdraw: 0, net: 0, count: 0, contribCount: 0, withdrawCount: 0 };
      map.set(t.date, d);
    }
    if (t.type === TX.WITHDRAWAL) {
      d.withdraw += t.amount;
      d.withdrawCount += 1;
    } else {
      d.contrib += t.amount;
      d.contribCount += 1;
    }
    d.net = d.contrib - d.withdraw;
    d.count += 1;
  }
  return map;
}

export function sortTransactionsDesc(txs) {
  return [...txs].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}
