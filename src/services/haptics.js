/**
 * Optional haptics. Respects the in-app toggle and the device's own settings
 * (ignoreAndroidSystemSettings: false).
 */
import { useCallback, useMemo } from 'react';
import HapticFeedback from 'react-native-haptic-feedback';
import { usePreferences } from '../store/preferences';

const OPTIONS = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };

const MAP = {
  tick: 'selection',
  light: 'impactLight',
  medium: 'impactMedium',
  confirm: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
};

export function useHaptics() {
  const { prefs } = usePreferences();
  const enabled = prefs.hapticsEnabled;
  const fire = useCallback(
    kind => {
      if (!enabled) {
        return;
      }
      try {
        HapticFeedback.trigger(MAP[kind] || 'impactLight', OPTIONS);
      } catch {
        // haptics are best-effort
      }
    },
    [enabled],
  );
  return useMemo(() => ({ fire, enabled }), [fire, enabled]);
}
