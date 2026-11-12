import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/** Deep links: stashly://save → Savings Dial, stashly://goal/<id> → goal. */
export const linking = {
  prefixes: ['stashly://'],
  config: {
    screens: {
      Main: '',
      SavingsDial: 'save',
      GoalDetail: 'goal/:goalId',
    },
  },
};

/** Perform an app action (from a reminder tap) once navigation is ready. */
export function runAppAction(action, { onboarded }) {
  if (!navigationRef.isReady() || !onboarded) {
    return false;
  }
  if (action === 'save') {
    navigationRef.navigate('SavingsDial', { source: 'reminder' });
    return true;
  }
  return false;
}
