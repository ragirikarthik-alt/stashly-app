/**
 * App data store. Single source of truth for Home, Goals, Calendar and Insights:
 * every screen reads the same goals + transactions loaded from SQLite, and every
 * write goes through the repository first (local persistence before UI update).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { initDatabase } from '../database/db';
import {
  goalRepository,
  transactionRepository,
  milestoneRepository,
  clearDatabase,
  replaceAll,
  relabelCurrency as relabelCurrencyInDb,
} from '../database/repositories';
import { buildGoalStats, deriveStatus, goalBalance, signedAmount, STATUS, TX } from '../services/calculations';
import { computeAchievedKeys, describeMilestone } from '../services/milestones';
import { deleteGoalImage, deleteAllImages, pruneOrphanImages } from '../services/images';
import { materializeImages } from '../services/backup';
import { uuid } from '../utils/id';
import { isDateKey, nowIso, todayKey } from '../utils/dates';
import { MAX_MINOR, getCurrency } from '../utils/money';
import { usePreferences } from './preferences';
import { scheduleWidgetUpdate } from '../widgets/updateWidgets';

const DataContext = createContext(null);

export class ValidationError extends Error {}

function validateAmount(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new ValidationError('Amount must be greater than zero');
  }
  if (amount > MAX_MINOR) {
    throw new ValidationError('That amount is too large');
  }
}

function cleanText(v, max = 500) {
  if (v == null) {
    return null;
  }
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

export function DataProvider({ children }) {
  const { prefs } = usePreferences();
  const [state, setState] = useState({ ready: false, error: null, goals: [], transactions: [], milestones: [] });
  const writing = useRef(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  const reload = useCallback(async () => {
    const [goals, transactions, milestones] = await Promise.all([
      goalRepository.list(),
      transactionRepository.list(),
      milestoneRepository.list(),
    ]);
    const next = { ready: true, error: null, goals, transactions, milestones };
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await reload();
      } catch (e) {
        setState(s => ({ ...s, ready: true, error: e?.message || 'Could not open local storage' }));
      }
    })();
  }, [reload]);

  /**
   * After any ledger change: recompute goal statuses from balances, persist
   * transitions, detect newly completed goals and newly reached milestones.
   */
  const reconcile = useCallback(
    async snapshot => {
      const { goals, transactions } = snapshot;
      const now = nowIso();
      const completedNow = [];
      let changed = false;
      for (const g of goals) {
        const balance = goalBalance(g.id, transactions);
        const status = deriveStatus(g, balance);
        if (status !== g.status) {
          const next = {
            ...g,
            status,
            updatedAt: now,
            completedAt: status === STATUS.COMPLETED ? g.completedAt || now : null,
          };
          await goalRepository.update(next);
          if (status === STATUS.COMPLETED) {
            completedNow.push(next);
          }
          changed = true;
        }
      }
      if (changed) {
        snapshot = await reload();
      }
      const stats = buildGoalStats(snapshot.goals, snapshot.transactions);
      const achieved = computeAchievedKeys(snapshot.goals, snapshot.transactions, stats, prefs.currencyCode);
      const known = new Set(snapshot.milestones.map(m => m.key));
      const fresh = achieved.filter(k => !known.has(k));
      if (fresh.length) {
        await milestoneRepository.insertMany(fresh, now);
        snapshot = await reload();
      }
      return {
        completedNow,
        newMilestones: fresh.map(k => describeMilestone(k, snapshot.goals, prefs.currencyCode)),
      };
    },
    [reload, prefs.currencyCode],
  );

  /* ---------------- goals ---------------- */

  const createGoal = useCallback(
    async input => {
      const name = cleanText(input.name, 80);
      if (!name) {
        throw new ValidationError('Give your goal a name');
      }
      validateAmount(input.targetAmount);
      if (input.targetDate && !isDateKey(input.targetDate)) {
        throw new ValidationError('Invalid target date');
      }
      const now = nowIso();
      const goal = {
        id: uuid(),
        name,
        targetAmount: input.targetAmount,
        currencyCode: prefs.currencyCode,
        imageUri: input.imageUri || null,
        productUrl: cleanText(input.productUrl, 500),
        category: input.category || null,
        priority: input.priority || null,
        targetDate: input.targetDate || null,
        notes: cleanText(input.notes, 1000),
        status: STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        archivedAt: null,
      };
      await goalRepository.insert(goal);
      await reload();
      return goal;
    },
    [prefs.currencyCode, reload],
  );

  const updateGoal = useCallback(
    async (id, patch) => {
      const current = stateRef.current.goals.find(g => g.id === id);
      if (!current) {
        throw new ValidationError('Goal not found');
      }
      const next = { ...current, ...patch, updatedAt: nowIso() };
      next.name = cleanText(next.name, 80);
      if (!next.name) {
        throw new ValidationError('Give your goal a name');
      }
      validateAmount(next.targetAmount);
      if (next.targetDate && !isDateKey(next.targetDate)) {
        throw new ValidationError('Invalid target date');
      }
      next.productUrl = cleanText(next.productUrl, 500);
      next.notes = cleanText(next.notes, 1000);
      if (current.imageUri && current.imageUri !== next.imageUri) {
        await deleteGoalImage(current.imageUri);
      }
      await goalRepository.update(next);
      const snap = await reload();
      return reconcile(snap);
    },
    [reload, reconcile],
  );

  const archiveGoal = useCallback(
    async id => {
      const g = stateRef.current.goals.find(x => x.id === id);
      if (!g) {
        return;
      }
      const now = nowIso();
      await goalRepository.update({ ...g, status: STATUS.ARCHIVED, archivedAt: now, updatedAt: now });
      await reload();
    },
    [reload],
  );

  const restoreGoal = useCallback(
    async id => {
      const g = stateRef.current.goals.find(x => x.id === id);
      if (!g) {
        return;
      }
      const balance = goalBalance(id, stateRef.current.transactions);
      const now = nowIso();
      const status = balance >= g.targetAmount ? STATUS.COMPLETED : STATUS.ACTIVE;
      await goalRepository.update({
        ...g,
        status,
        archivedAt: null,
        updatedAt: now,
        completedAt: status === STATUS.COMPLETED ? g.completedAt || now : null,
      });
      await reload();
    },
    [reload],
  );

  const deleteGoal = useCallback(
    async id => {
      const g = stateRef.current.goals.find(x => x.id === id);
      await goalRepository.remove(id);
      if (g?.imageUri) {
        await deleteGoalImage(g.imageUri);
      }
      await reload();
    },
    [reload],
  );

  /* ---------------- transactions ---------------- */

  /**
   * Records a contribution or withdrawal. `input.id` is an idempotency key: the
   * Savings Dial generates it once per session so repeated taps can never
   * create duplicates (INSERT OR IGNORE + in-flight guard).
   */
  const addTransaction = useCallback(
    async input => {
      const id = input.id || uuid();
      if (writing.current.has(id)) {
        return { duplicate: true };
      }
      writing.current.add(id);
      try {
        const { goals, transactions } = stateRef.current;
        const goal = goals.find(g => g.id === input.goalId);
        if (!goal) {
          throw new ValidationError('Choose a goal first');
        }
        validateAmount(input.amount);
        const type = input.type === TX.WITHDRAWAL ? TX.WITHDRAWAL : TX.CONTRIBUTION;
        const date = input.date || todayKey();
        if (!isDateKey(date)) {
          throw new ValidationError('Invalid date');
        }
        if (type === TX.WITHDRAWAL) {
          const balance = goalBalance(goal.id, transactions);
          if (input.amount > balance) {
            throw new ValidationError('A withdrawal can’t be larger than the amount saved for this goal');
          }
        }
        const now = nowIso();
        const tx = {
          id,
          goalId: goal.id,
          type,
          amount: input.amount,
          currencyCode: goal.currencyCode,
          date,
          note: cleanText(input.note, 280),
          source: input.source || null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        const inserted = await transactionRepository.insert(tx);
        const snap = await reload();
        if (!inserted) {
          return { duplicate: true, tx };
        }
        const result = await reconcile(snap);
        return { tx, ...result };
      } finally {
        writing.current.delete(id);
      }
    },
    [reload, reconcile],
  );

  const updateTransaction = useCallback(
    async (id, patch) => {
      const { goals, transactions } = stateRef.current;
      const current = transactions.find(t => t.id === id);
      if (!current) {
        throw new ValidationError('This entry no longer exists');
      }
      const next = { ...current, ...patch, updatedAt: nowIso() };
      validateAmount(next.amount);
      if (!isDateKey(next.date)) {
        throw new ValidationError('Invalid date');
      }
      if (!goals.some(g => g.id === next.goalId)) {
        throw new ValidationError('Choose a goal');
      }
      next.note = cleanText(next.note, 280);
      // Both the old and (if moved) the new goal must stay non-negative.
      const others = transactions.filter(t => t.id !== id);
      for (const gid of new Set([current.goalId, next.goalId])) {
        const bal = goalBalance(gid, others) + (gid === next.goalId ? signedAmount(next) : 0);
        if (bal < 0) {
          throw new ValidationError('This change would make the goal balance negative');
        }
      }
      await transactionRepository.update(next);
      const snap = await reload();
      return reconcile(snap);
    },
    [reload, reconcile],
  );

  const deleteTransaction = useCallback(
    async id => {
      const { transactions } = stateRef.current;
      const t = transactions.find(x => x.id === id);
      if (!t) {
        return null;
      }
      if (t.type === TX.CONTRIBUTION) {
        const bal = goalBalance(t.goalId, transactions) - t.amount;
        if (bal < 0) {
          throw new ValidationError(
            'Removing this contribution would make the goal balance negative. Remove a later withdrawal first.',
          );
        }
      }
      await transactionRepository.softDelete(id, nowIso());
      const snap = await reload();
      await reconcile(snap);
      return t;
    },
    [reload, reconcile],
  );

  const restoreTransaction = useCallback(
    async id => {
      const t = await transactionRepository.getById(id);
      if (!t) {
        return;
      }
      if (t.type === TX.WITHDRAWAL) {
        const bal = goalBalance(t.goalId, stateRef.current.transactions);
        if (t.amount > bal) {
          throw new ValidationError('Can’t restore: the goal no longer has enough saved for this withdrawal');
        }
      }
      await transactionRepository.restore(id, nowIso());
      const snap = await reload();
      return reconcile(snap);
    },
    [reload, reconcile],
  );

  /* ---------------- whole-store operations ---------------- */

  const clearAllData = useCallback(async () => {
    await clearDatabase();
    await deleteAllImages();
    await reload();
  }, [reload]);

  const restoreFromBackup = useCallback(
    async backup => {
      const goals = await materializeImages(backup);
      await replaceAll({ goals, transactions: backup.transactions, milestones: backup.milestones });
      await pruneOrphanImages(goals.map(g => g.imageUri));
      const snap = await reload();
      await reconcile(snap);
    },
    [reload, reconcile],
  );

  const relabelCurrency = useCallback(
    async (fromCode, toCode) => {
      await relabelCurrencyInDb(toCode, getCurrency(fromCode).decimals, getCurrency(toCode).decimals);
      await reload();
    },
    [reload],
  );

  /** Development-only sample data, clearly labelled in the UI. */
  const seedDemoData = useCallback(async () => {
    const { buildDemoData } = require('../services/demo');
    const demo = buildDemoData(prefs.currencyCode, todayKey());
    await replaceAll({ goals: demo.goals, transactions: demo.transactions, milestones: [] });
    const snap = await reload();
    await reconcile(snap);
  }, [prefs.currencyCode, reload, reconcile]);

  const stats = useMemo(() => buildGoalStats(state.goals, state.transactions), [state.goals, state.transactions]);

  // Keep home-screen widgets in sync with the ledger and currency.
  useEffect(() => {
    if (state.ready && !state.error) {
      scheduleWidgetUpdate({
        goals: state.goals,
        transactions: state.transactions,
        currency: prefs.currencyCode,
        onboarded: prefs.onboarded,
      });
    }
  }, [state.ready, state.error, state.goals, state.transactions, prefs.currencyCode, prefs.onboarded]);

  const value = useMemo(
    () => ({
      ...state,
      stats,
      reload,
      createGoal,
      updateGoal,
      archiveGoal,
      restoreGoal,
      deleteGoal,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      restoreTransaction,
      clearAllData,
      restoreFromBackup,
      seedDemoData,
      relabelCurrency,
    }),
    [
      relabelCurrency,
      state,
      stats,
      reload,
      createGoal,
      updateGoal,
      archiveGoal,
      restoreGoal,
      deleteGoal,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      restoreTransaction,
      clearAllData,
      restoreFromBackup,
      seedDemoData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used inside DataProvider');
  }
  return ctx;
}

export function useGoal(goalId) {
  const { goals, stats } = useData();
  const goal = goals.find(g => g.id === goalId) || null;
  return { goal, stat: goal ? stats.get(goal.id) : null };
}
