import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { palettes, spacing, radius, type } from './tokens';
import { usePreferences } from '../store/preferences';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const { prefs } = usePreferences();
  const [osReduceMotion, setOsReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOsReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOsReduceMotion);
    return () => sub?.remove?.();
  }, []);

  const scheme = prefs.themePreference === 'system' ? (system === 'dark' ? 'dark' : 'light') : prefs.themePreference;

  const value = useMemo(
    () => ({
      colors: palettes[scheme],
      scheme,
      isDark: scheme === 'dark',
      spacing,
      radius,
      type,
      reduceMotion: osReduceMotion || prefs.reduceMotion,
      osReduceMotion,
      celebrations: prefs.celebrations,
    }),
    [scheme, osReduceMotion, prefs.reduceMotion, prefs.celebrations],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

/** Duration helper: collapses to 0 when reduced motion is on. */
export function useMotion() {
  const { reduceMotion } = useTheme();
  return useMemo(
    () => ({
      reduced: reduceMotion,
      duration: ms => (reduceMotion ? 0 : ms),
    }),
    [reduceMotion],
  );
}
