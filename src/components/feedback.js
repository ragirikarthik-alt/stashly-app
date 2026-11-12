import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck, CircleAlert, Sparkles, Trophy } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, Button } from './ui';
import { GoalVisual } from './goal';
import { formatMoney } from '../utils/money';
import { useHaptics } from '../services/haptics';

/* ================= Toast / snackbar with optional Undo ================= */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(
    ({ message, tone = 'success', action, duration }) => {
      clearTimeout(timer.current);
      const id = Date.now();
      setToast({ id, message, tone, action });
      timer.current = setTimeout(hide, duration ?? (action ? 6000 : 3200));
    },
    [hide],
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onHide={hide} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onHide }) {
  const { colors, radius, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const Icon = toast.tone === 'error' ? CircleAlert : toast.tone === 'milestone' ? Sparkles : CircleCheck;
  const iconColor = toast.tone === 'error' ? '#F5A39B' : '#6EE7B0';
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(220)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(160)}
      style={[styles.toastWrap, { bottom: Math.max(insets.bottom, 12) + 12 }]}
      pointerEvents="box-none"
    >
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { borderRadius: radius.lg, backgroundColor: colors.scheme === 'dark' ? '#2B3F36' : '#17221D' }]}
      >
        <Icon size={20} color={iconColor} />
        <AppText variant="smallStrong" color="#F3F7F3" style={{ flex: 1 }}>
          {toast.message}
        </AppText>
        {toast.action ? (
          <Pressable
            onPress={() => {
              onHide();
              toast.action.onPress();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            style={styles.toastAction}
          >
            <AppText variant="smallStrong" color="#6EE7B0">
              {toast.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ================= Goal completion celebration ================= */

const CelebrationContext = createContext(null);

export function CelebrationProvider({ children, onArchive }) {
  const [goal, setGoal] = useState(null);
  const value = useMemo(() => ({ celebrate: g => setGoal(g) }), []);
  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {goal ? (
        <CelebrationModal
          goal={goal}
          onKeep={() => setGoal(null)}
          onArchive={async () => {
            const g = goal;
            setGoal(null);
            await onArchive?.(g);
          }}
        />
      ) : null}
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  return useContext(CelebrationContext);
}

/** A few softly drifting sparkles — brief, restrained, skipped with reduced motion. */
function Sparkle({ x, y, delay, size }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 700 })), 2, false));
  }, [delay, v]);
  const s = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: -14 * v.value }, { scale: 0.6 + 0.4 * v.value }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, s]}>
      <Sparkles size={size} color="#6EE7B0" />
    </Animated.View>
  );
}

function CelebrationModal({ goal, onKeep, onArchive }) {
  const { colors, radius, reduceMotion, celebrations } = useTheme();
  const { fire } = useHaptics();
  const animate = celebrations && !reduceMotion;
  useEffect(() => {
    fire('confirm');
  }, [fire]);
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onKeep}>
      <View style={[styles.celebrateBackdrop, { backgroundColor: colors.scrim }]}>
        <Animated.View
          entering={animate ? FadeIn.duration(220) : FadeIn}
          style={[styles.celebrateCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
          accessibilityViewIsModal
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View>
              <GoalVisual goal={goal} size={96} />
              <View style={[styles.trophy, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                <Trophy size={16} color={colors.onPrimary} />
              </View>
            </View>
            {animate ? (
              <>
                <Sparkle x={-30} y={4} delay={0} size={16} />
                <Sparkle x={110} y={-6} delay={250} size={20} />
                <Sparkle x={100} y={70} delay={500} size={14} />
                <Sparkle x={-22} y={70} delay={380} size={12} />
              </>
            ) : null}
          </View>
          <AppText variant="h2" center accessibilityRole="header">
            Goal reached
          </AppText>
          <AppText variant="body" tone="muted" center style={{ marginTop: 6 }}>
            You’ve saved {formatMoney(goal.targetAmount, goal.currencyCode)} for {goal.name}. Nicely done.
          </AppText>
          <AppText variant="small" tone="muted" center style={{ marginTop: 12 }}>
            Archive it, or keep it visible alongside your other goals?
          </AppText>
          <View style={{ gap: 10, marginTop: 20 }}>
            <Button title="Keep visible" onPress={onKeep} />
            <Button title="Archive goal" variant="secondary" onPress={onArchive} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, zIndex: 999 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastAction: { paddingHorizontal: 6, paddingVertical: 4 },
  celebrateBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  celebrateCard: { width: '100%', maxWidth: 380, padding: 24 },
  trophy: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
});
