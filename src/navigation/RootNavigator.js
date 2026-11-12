import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { usePreferences } from '../store/preferences';
import { useTheme } from '../theme/ThemeProvider';
import { MainScreen } from './MainScreen';
import { WelcomeScreen } from '../features/welcome/WelcomeScreen';
import { OnboardingScreen } from '../features/welcome/OnboardingScreen';
import { GoalDetailScreen } from '../features/goals/GoalDetailScreen';
import { GoalEditorScreen } from '../features/goals/GoalEditorScreen';
import { SavingsDialScreen } from '../features/contributions/SavingsDialScreen';
import { TransactionScreen } from '../features/contributions/TransactionScreen';
import { HistoryScreen } from '../features/contributions/HistoryScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { prefs } = usePreferences();
  const { colors, reduceMotion } = useTheme();
  const anim = reduceMotion ? 'none' : 'default';
  return (
    <Stack.Navigator
      initialRouteName={prefs.onboarded ? 'Main' : 'Welcome'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reduceMotion ? 'none' : 'ios_from_right',
        animationDuration: 320,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: anim }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: reduceMotion ? 'none' : 'fade_from_bottom' }} />
      <Stack.Screen name="Main" component={MainScreen} options={{ animation: reduceMotion ? 'none' : 'fade' }} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <Stack.Screen name="GoalEditor" component={GoalEditorScreen} options={{ animation: reduceMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen
        name="SavingsDial"
        component={SavingsDialScreen}
        options={{
          animation: reduceMotion ? 'none' : 'slide_from_bottom',
          contentStyle: { backgroundColor: '#071C15' },
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="Transaction" component={TransactionScreen} options={{ animation: reduceMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}
