import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, AppState, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { PreferencesProvider } from './store/preferences';
import { DataProvider, useData } from './store/data';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { ToastProvider, CelebrationProvider } from './components/feedback';
import { RootNavigator } from './navigation/RootNavigator';
import { AppText, Button } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePreferences } from './store/preferences';
import { linking, navigationRef, runAppAction } from './navigation/navigationRef';
import { takePendingAction } from './navigation/pendingAction';
import { getLaunchAction, onReminderPress, scheduleDailyReminder } from './services/reminders';

function Shell() {
  const { colors, isDark } = useTheme();
  const { ready, error, archiveGoal, reload, goals, stats } = useData();
  const { prefs } = usePreferences();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // Actions requested by reminder taps: launch, foreground, or while backgrounded.
  const drainActions = useCallback(async () => {
    const pending = takePendingAction() || (await getLaunchAction());
    if (pending) {
      runAppAction(pending, { onboarded: prefsRef.current.onboarded });
    }
  }, []);

  useEffect(() => {
    const unsub = onReminderPress(action => runAppAction(action, { onboarded: prefsRef.current.onboarded }));
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') {
        const pending = takePendingAction();
        if (pending) {
          runAppAction(pending, { onboarded: prefsRef.current.onboarded });
        }
      }
    });
    return () => {
      unsub?.();
      sub.remove();
    };
  }, []);

  // Refresh the reminder once per launch so its message reflects current goals.
  const refreshed = useRef(false);
  useEffect(() => {
    if (ready && !refreshed.current && prefs.reminderEnabled) {
      refreshed.current = true;
      scheduleDailyReminder({ hour: prefs.reminderHour, minute: prefs.reminderMinute, goals, stats }).catch(() => {});
    }
  }, [ready, prefs.reminderEnabled, prefs.reminderHour, prefs.reminderMinute, goals, stats]);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [isDark, colors]);

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <AppText variant="h2" center>
          Couldn’t open your savings
        </AppText>
        <AppText tone="muted" center style={{ marginTop: 8 }}>
          {error}
        </AppText>
        <Button title="Try again" onPress={reload} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <CelebrationProvider onArchive={g => archiveGoal(g.id)}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking} onReady={drainActions}>
        <RootNavigator />
      </NavigationContainer>
    </CelebrationProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <ThemeProvider>
            <DataProvider>
              <ToastProvider>
                <ErrorBoundary>
                  <Shell />
                </ErrorBoundary>
              </ToastProvider>
            </DataProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
