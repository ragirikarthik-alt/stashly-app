/**
 * Data for the home-screen widgets, read straight from the local database.
 * Runs inside the widget's headless task as well as inside the app.
 */
import { initDatabase } from '../database/db';
import { goalRepository, transactionRepository } from '../database/repositories';
import { activeSavingsTotal, buildGoalStats, STATUS } from '../services/calculations';
import { summarize } from '../services/analytics';
import { loadPreferences } from '../store/preferences';
import { firstOfMonth, splitKey, todayKey } from '../utils/dates';

export async function loadWidgetData() {
  await initDatabase();
  const prefs = loadPreferences();
  const [goals, transactions] = await Promise.all([goalRepository.list(), transactionRepository.list()]);
  return buildWidgetData({ goals, transactions, currency: prefs.currencyCode, onboarded: prefs.onboarded });
}

export function buildWidgetData({ goals, transactions, currency, onboarded = true }) {
  const stats = buildGoalStats(goals, transactions);
  const visible = goals.filter(g => g.status !== STATUS.ARCHIVED);
  const total = activeSavingsTotal(goals, stats);
  const targetTotal = visible.reduce((s, g) => s + g.targetAmount, 0);
  const today = todayKey();
  const { y, m } = splitKey(today);
  const month = summarize(transactions, { from: firstOfMonth(y, m - 1), to: today });
  // Focus goal: unfinished goal with the most recent activity.
  const focus =
    [...visible]
      .filter(g => g.status === STATUS.ACTIVE)
      .sort((a, b) => ((stats.get(b.id)?.lastDate || '') > (stats.get(a.id)?.lastDate || '') ? 1 : -1))[0] ||
    visible[0] ||
    null;
  const fs = focus ? stats.get(focus.id) : null;
  // Up to three goals for taller widgets: unfinished first, most recent activity first.
  const top = [...visible]
    .sort((a, b) => {
      const ca = a.status === STATUS.COMPLETED ? 1 : 0;
      const cb = b.status === STATUS.COMPLETED ? 1 : 0;
      if (ca !== cb) {
        return ca - cb;
      }
      return (stats.get(b.id)?.lastDate || '') > (stats.get(a.id)?.lastDate || '') ? 1 : -1;
    })
    .slice(0, 3)
    .map(g => {
      const s = stats.get(g.id);
      return { id: g.id, name: g.name, balance: s.balance, target: g.targetAmount, ratio: s.ratio, percent: s.percent };
    });
  return {
    goals: top,
    onboarded,
    currency,
    goalCount: visible.length,
    total,
    targetTotal,
    overall: targetTotal ? Math.min(Math.max(total, 0) / targetTotal, 1) : 0,
    monthContrib: month.contributionTotal,
    focus: focus
      ? { id: focus.id, name: focus.name, balance: fs.balance, target: focus.targetAmount, ratio: fs.ratio, percent: fs.percent }
      : null,
  };
}
