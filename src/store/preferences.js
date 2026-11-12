/**
 * Lightweight preferences in MMKV (synchronous, JSI). Ledger data lives in SQLite.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createMMKV } from 'react-native-mmkv';
import { DEFAULT_CURRENCY } from '../utils/money';

export const storage = createMMKV({ id: 'stashly-preferences' });

export const DEFAULT_PREFERENCES = {
  displayName: '',
  currencyCode: DEFAULT_CURRENCY,
  themePreference: 'system', // 'system' | 'light' | 'dark'
  hapticsEnabled: true,
  reduceMotion: false, // app-level; OS reduce-motion is always respected too
  celebrations: true,
  showStreak: true,
  onboarded: false,
  calendarMode: 'month', // 'month' | 'timeline'
  insightsRange: 'daily',
  reminderEnabled: false,
  reminderHour: 20, // local time, 24h
  reminderMinute: 0,
  createdAt: null,
};

const KEY = 'preferences.v1';

/** Synchronous read for non-UI contexts (widgets, headless tasks). */
export function loadPreferences() {
  return load();
}

function load() {
  try {
    const raw = storage.getString(KEY);
    if (!raw) {
      return { ...DEFAULT_PREFERENCES, createdAt: new Date().toISOString() };
    }
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function persist(prefs) {
  storage.set(KEY, JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }));
}

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(load);

  const update = useCallback(patch => {
    setPrefs(prev => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      persist(next);
      return next;
    });
  }, []);

  /** Wipes every preference (used by "Clear all local data"). */
  const reset = useCallback(() => {
    storage.clearAll();
    const fresh = { ...DEFAULT_PREFERENCES, createdAt: new Date().toISOString() };
    setPrefs(fresh);
  }, []);

  const value = useMemo(() => ({ prefs, update, reset }), [prefs, update, reset]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return ctx;
}
