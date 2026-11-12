import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Keyboard, CalendarDays, ChevronDown, ChevronsUp, MoveVertical, StickyNote, RotateCcw } from 'lucide-react-native';
import { useData, ValidationError } from '../../store/data';
import { useTheme } from '../../theme/ThemeProvider';
import { dialPalette as P } from '../../theme/tokens';
import { useHaptics } from '../../services/haptics';
import { useToast, useCelebration } from '../../components/feedback';
import { KeypadSheet } from '../../components/keypad';
import { GoalPickerSheet } from '../../components/goalPicker';
import { DatePickerSheet } from '../../components/calendar';
import { BottomSheet } from '../../components/sheet';
import { GoalVisual } from '../../components/goal';
import { AppText, Button } from '../../components/ui';
import { SaveAurora } from '../../components/saveAurora';
import { GlassButton } from '../../components/glass';
import { dialSteps, formatMoney, MAX_MINOR, DEFAULT_CURRENCY } from '../../utils/money';
import { formatDateKey, todayKey } from '../../utils/dates';
import { TX, STATUS } from '../../services/calculations';
import { usePreferences } from '../../store/preferences';
import { uuid } from '../../utils/id';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STEP_PX = 14; // vertical drag distance per increment
const SENSITIVITY_PX = 46; // horizontal drag distance to change increment level
const CONFIRM_TRACK = 80; // swipe-up distance to confirm

export function SavingsDialScreen({ navigation, route }) {
  const params = route.params || {};
  const { goals, stats, addTransaction, deleteTransaction } = useData();
  const { prefs } = usePreferences();
  const { reduceMotion, celebrations } = useTheme();
  const { fire } = useHaptics();
  const toast = useToast();
  const { celebrate } = useCelebration();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const compact = winH < 720;

  const visibleGoals = useMemo(() => goals.filter(g => g.status !== STATUS.ARCHIVED), [goals]);
  const [goalId, setGoalId] = useState(
    () => params.goalId || (visibleGoals.length === 1 ? visibleGoals[0].id : null),
  );
  const [date, setDate] = useState(params.date || todayKey());
  const [type, setType] = useState(params.type === TX.WITHDRAWAL ? TX.WITHDRAWAL : TX.CONTRIBUTION);
  const [note, setNote] = useState('');
  const goal = goals.find(g => g.id === goalId) || null;
  const currency = goal?.currencyCode || prefs.currencyCode || DEFAULT_CURRENCY;
  const steps = useMemo(() => dialSteps(currency), [currency]);
  const [stepIndex, setStepIndex] = useState(1);
  const step = steps[stepIndex];
  const [amount, setAmount] = useState(0);
  const [phase, setPhase] = useState('edit'); // edit | saving | saved | error
  const [error, setError] = useState(null);
  const [sheet, setSheet] = useState(null); // keypad | goal | date | note
  const sessionId = useRef(uuid());
  const amountRef = useRef(0);
  amountRef.current = amount;

  const stat = goal ? stats.get(goal.id) : null;
  const balance = stat?.balance ?? 0;
  const isW = type === TX.WITHDRAWAL;
  const maxAmount = isW ? Math.max(balance, 0) : MAX_MINOR;
  const accent = isW ? P.withdraw : P.accent;

  // Keep amount within bounds if goal/type changes.
  useEffect(() => {
    setAmount(a => Math.min(a, maxAmount));
  }, [maxAmount]);

  /* ---------- amount mutation (shared by gesture + buttons + keypad) ---------- */

  const bump = useSharedValue(1);
  const pulse = useCallback(() => {
    if (!reduceMotion) {
      bump.value = withSequence(withTiming(1.04, { duration: 70 }), withTiming(1, { duration: 120 }));
    }
  }, [bump, reduceMotion]);

  const changeBy = useCallback(
    delta => {
      setError(null);
      const prev = amountRef.current;
      const next = Math.max(0, Math.min(maxAmount, prev + delta));
      if (next === prev) {
        fire('warning');
        return;
      }
      amountRef.current = next;
      setAmount(next);
      fire('tick');
      pulse();
    },
    [maxAmount, fire, pulse],
  );

  const changeStep = useCallback(
    dir => {
      setStepIndex(i => {
        const n = Math.max(0, Math.min(steps.length - 1, i + dir));
        if (n !== i) {
          fire('medium');
        }
        return n;
      });
    },
    [steps.length, fire],
  );

  /* ---------- dial gesture: vertical = amount, horizontal = sensitivity ---------- */

  const g = useRef({ axis: null, applied: 0, stepChanged: false });
  const dragging = useSharedValue(0);
  const dialGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(phase === 'edit' || phase === 'error')
        .minDistance(6)
        .onBegin(() => {
          g.current = { axis: null, applied: 0, stepChanged: false };
          dragging.value = withTiming(1, { duration: 120 });
        })
        .onUpdate(e => {
          const s = g.current;
          if (!s.axis) {
            if (Math.abs(e.translationY) > 10 && Math.abs(e.translationY) >= Math.abs(e.translationX)) {
              s.axis = 'v';
            } else if (Math.abs(e.translationX) > 22 && Math.abs(e.translationX) > 1.6 * Math.abs(e.translationY)) {
              s.axis = 'h';
            } else {
              return;
            }
          }
          if (s.axis === 'v') {
            const target = Math.trunc(-e.translationY / STEP_PX);
            const delta = target - s.applied;
            if (delta !== 0) {
              s.applied = target;
              changeBy(delta * step);
            }
          } else if (!s.stepChanged && Math.abs(e.translationX) > SENSITIVITY_PX) {
            // Only changes the increment, never the amount.
            s.stepChanged = true;
            changeStep(e.translationX > 0 ? 1 : -1);
          }
        })
        .onFinalize(() => {
          dragging.value = withTiming(0, { duration: 200 });
        }),
    [phase, changeBy, changeStep, step, dragging],
  );

  /* ---------- confirmation ---------- */

  const savedProgress = useRef({ to: 0 });

  // The dial dims behind the save animation, like the reference.
  const dim = useSharedValue(1);
  useEffect(() => {
    const busy = phase === 'saving' || phase === 'saved';
    dim.value = withTiming(busy ? 0 : 1, { duration: reduceMotion ? 0 : busy ? 380 : 300, easing: Easing.out(Easing.cubic) });
  }, [phase, reduceMotion, dim]);
  const dimStyle = useAnimatedStyle(() => ({
    opacity: 0.14 + 0.86 * dim.value,
    transform: [{ scale: 0.97 + 0.03 * dim.value }],
  }));

  const confirm = useCallback(async () => {
    if (phase !== 'edit' && phase !== 'error') {
      return;
    }
    if (!goal) {
      setError('Choose a goal first');
      fire('warning');
      setSheet('goal');
      return;
    }
    if (amount <= 0) {
      setError('Set an amount above zero');
      fire('warning');
      return;
    }
    setPhase('saving');
    setError(null);
    const startedAt = Date.now();
    try {
      const res = await addTransaction({
        id: sessionId.current,
        goalId: goal.id,
        type,
        amount,
        date,
        note,
        source: params.source || 'dial',
      });
      if (res.duplicate && !res.tx) {
        return;
      }
      const newBalance = balance + (isW ? -amount : amount);
      savedProgress.current = { to: Math.min(Math.max(newBalance, 0) / goal.targetAmount, 1) };
      const wait = reduceMotion ? 0 : Math.max(0, 1100 - (Date.now() - startedAt));
      await new Promise(r => setTimeout(r, wait));
      fire('confirm');
      setPhase('saved');
      const finish = () => {
        navigation.goBack();
        const milestone = celebrations && res.newMilestones?.length ? ` · ${res.newMilestones[0].title} unlocked` : '';
        toast.show({
          message: `${isW ? 'Withdrew' : 'Saved'} ${formatMoney(amount, currency)} ${isW ? 'from' : 'to'} ${goal.name}${milestone}`,
          tone: milestone ? 'milestone' : 'success',
          action: {
            label: 'Undo',
            onPress: async () => {
              try {
                await deleteTransaction(res.tx.id);
                toast.show({ message: 'Entry removed', tone: 'success' });
              } catch (e) {
                toast.show({ message: e.message || 'Couldn’t undo', tone: 'error' });
              }
            },
          },
        });
        if (res.completedNow?.some(x => x.id === goal.id)) {
          celebrate(res.completedNow.find(x => x.id === goal.id));
        }
      };
      setTimeout(finish, reduceMotion ? 700 : 2100);
    } catch (e) {
      // Preserve the entered amount and let the user retry.
      setPhase('error');
      setError(e instanceof ValidationError ? e.message : 'Couldn’t save. Your amount is kept — try again.');
      fire('error');
    }
  }, [phase, goal, amount, addTransaction, type, date, note, params.source, fire, balance, isW, navigation, celebrations, toast, currency, deleteTransaction, celebrate, reduceMotion]);

  /* ---------- swipe-up confirm knob ---------- */

  const knobY = useSharedValue(0);
  const confirmGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetY([-8, 8])
      .enabled(phase === 'edit' || phase === 'error')
      .onUpdate(e => {
        knobY.value = Math.max(-CONFIRM_TRACK, Math.min(0, e.translationY));
      })
      .onEnd(() => {
        if (knobY.value <= -CONFIRM_TRACK * 0.8) {
          scheduleOnRN(confirm);
        }
        knobY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      });
    const tap = Gesture.Tap()
      .enabled(phase === 'edit' || phase === 'error')
      .onEnd((_e, ok) => {
        if (ok) {
          scheduleOnRN(confirm);
        }
      });
    return Gesture.Race(pan, tap);
  }, [phase, confirm, knobY]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: knobY.value }] }));
  const zoneStyle = useAnimatedStyle(() => {
    const t = -knobY.value / CONFIRM_TRACK;
    return {
      opacity: interpolate(t, [0, 0.15, 1], [0.0, 0.6, 1]),
      backgroundColor: interpolateColor(t, [0, 0.79, 0.8], ['rgba(110,231,176,0.08)', 'rgba(110,231,176,0.16)', 'rgba(110,231,176,0.32)']),
    };
  });
  const zoneTextStyle = useAnimatedStyle(() => ({ opacity: interpolate(-knobY.value / CONFIRM_TRACK, [0, 0.3, 1], [0, 0.6, 1]) }));
  const amountStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: 1 - dragging.value * 0.6 }));

  /* ---------- arc ---------- */

  const arcW = Math.min(winW - 48, 360);
  const r = arcW / 2 - 14;
  const cx = arcW / 2;
  const cy = arcW / 2;
  const arcLen = Math.PI * r;
  const baseRatio = goal ? Math.min(Math.max(balance, 0) / goal.targetAmount, 1) : 0;
  const afterRatio = goal ? Math.min(Math.max(balance + (isW ? -amount : amount), 0) / goal.targetAmount, 1) : 0;
  const base = useSharedValue(0);
  const after = useSharedValue(0);
  useEffect(() => {
    base.value = reduceMotion ? baseRatio : withTiming(baseRatio, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [baseRatio, reduceMotion, base]);
  useEffect(() => {
    after.value = reduceMotion ? afterRatio : withTiming(afterRatio, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [afterRatio, reduceMotion, after]);
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const baseProps = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - (isW ? after.value : base.value)) }));
  const afterProps = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - (isW ? base.value : after.value)) }));
  const knobProps = useAnimatedProps(() => {
    const a = Math.PI * (1 - after.value);
    return { cx: cx + r * Math.cos(a), cy: cy - r * Math.sin(a) };
  });

  const percentNow = goal ? Math.floor(baseRatio * 100) : 0;
  const percentAfter = goal ? Math.floor(afterRatio * 100) : 0;
  const bigStep = step * 5;

  /* ---------- render ---------- */

  return (
    <View style={styles.flex}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={P.top} />
            <Stop offset="1" stopColor={P.bottom} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      <Animated.View
        pointerEvents={phase === 'saving' || phase === 'saved' ? 'none' : 'auto'}
        style={[styles.flex, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }, dimStyle]}
      >
        {/* top bar */}
        <View style={styles.topBar}>
          <RoundButton icon={X} label="Close without saving" onPress={() => navigation.goBack()} />
          <TypeToggle value={type} onChange={t => { setType(t); setError(null); fire('tick'); }} disabled={phase !== 'edit' && phase !== 'error'} />
          <RoundButton icon={Keyboard} label="Enter exact amount" onPress={() => setSheet('keypad')} />
        </View>

        {/* context */}
        <View style={styles.contextRow}>
          <Pressable
            onPress={() => setSheet('goal')}
            accessibilityRole="button"
            accessibilityLabel={goal ? `Goal: ${goal.name}. Change goal` : 'Choose a goal'}
            style={[styles.chip, { borderColor: goal ? P.chipBorder : P.accent, flexShrink: 1 }]}
          >
            {goal ? <GoalVisual goal={goal} size={24} radius={8} /> : null}
            <AppText variant="smallStrong" color={goal ? P.text : P.accent} numberOfLines={1} style={{ flexShrink: 1 }}>
              {goal ? goal.name : 'Choose a goal'}
            </AppText>
            <ChevronDown size={16} color={P.muted} />
          </Pressable>
          <Pressable
            onPress={() => setSheet('date')}
            accessibilityRole="button"
            accessibilityLabel={`Date: ${formatDateKey(date, 'long')}. Change date`}
            style={styles.chip}
          >
            <CalendarDays size={16} color={P.muted} />
            <AppText variant="smallStrong" color={P.text}>
              {formatDateKey(date, 'relative')}
            </AppText>
          </Pressable>
        </View>

        {/* dial */}
        <GestureDetector gesture={dialGesture}>
          <View
            style={styles.dialArea}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`${isW ? 'Withdrawal' : 'Contribution'} amount`}
            accessibilityValue={{ text: formatMoney(amount, currency) }}
            accessibilityHint={`Swipe up or down to change by ${formatMoney(step, currency)}`}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: 'Enter exact amount' }]}
            onAccessibilityAction={e => {
              if (e.nativeEvent.actionName === 'increment') {
                changeBy(step);
              } else if (e.nativeEvent.actionName === 'decrement') {
                changeBy(-step);
              } else {
                setSheet('keypad');
              }
            }}
          >
            {
              <>
                <View style={{ width: arcW, height: arcW / 2 + 16 }}>
                  <Svg width={arcW} height={arcW / 2 + 16}>
                    <Path d={arcPath} stroke={P.track} strokeWidth={14} strokeLinecap="round" fill="none" />
                    <AnimatedPath
                      d={arcPath}
                      stroke={isW ? P.withdrawDim : P.accentDim}
                      strokeWidth={14}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${arcLen} ${arcLen}`}
                      animatedProps={afterProps}
                    />
                    <AnimatedPath
                      d={arcPath}
                      stroke={isW ? 'rgba(255,255,255,0.55)' : accent}
                      strokeWidth={14}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${arcLen} ${arcLen}`}
                      animatedProps={baseProps}
                    />
                    {goal ? <AnimatedCircle r={10} fill={P.text} stroke={accent} strokeWidth={4} animatedProps={knobProps} /> : null}
                  </Svg>
                  <View style={[StyleSheet.absoluteFill, styles.amountWrap]}>
                    <Pressable onPress={() => setSheet('keypad')} accessibilityLabel={`${formatMoney(amount, currency)}. Tap to type an exact amount`} hitSlop={10}>
                      <Animated.View style={amountStyle}>
                        <Text
                          style={[styles.amount, { color: amount ? P.text : P.muted, fontSize: compact ? 48 : 58 }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          maxFontSizeMultiplier={1.2}
                        >
                          {formatMoney(amount, currency)}
                        </Text>
                      </Animated.View>
                    </Pressable>
                    <AppText variant="small" color={P.muted} numeric center>
                      {goal
                        ? amount
                          ? `${percentNow}% → ${percentAfter}% of ${formatMoney(goal.targetAmount, currency)}`
                          : `${formatMoney(balance, currency)} of ${formatMoney(goal.targetAmount, currency)} · ${percentNow}%`
                        : 'Pick a goal to see progress'}
                    </AppText>
                  </View>
                </View>
                <Animated.View style={[styles.hint, hintStyle]}>
                  <MoveVertical size={15} color={P.muted} />
                  <AppText variant="caption" color={P.muted}>
                    Swipe up to increase · Swipe down to decrease
                  </AppText>
                </Animated.View>
                <AppText variant="caption" color={P.muted} style={{ opacity: 0.75, marginTop: 2 }}>
                  Swipe sideways to change the step
                </AppText>
              </>
            }
          </View>
        </GestureDetector>

          <>
            {/* increment selector */}
            <View style={styles.stepRow} accessibilityRole="radiogroup" accessibilityLabel="Step size">
              <AppText variant="caption" color={P.muted} style={{ marginRight: 4 }}>
                Step
              </AppText>
              {steps.map((s, i) => (
                <Pressable
                  key={s}
                  onPress={() => { setStepIndex(i); fire('tick'); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: i === stepIndex }}
                  accessibilityLabel={`Step ${formatMoney(s, currency)}`}
                  style={[styles.stepChip, i === stepIndex && { backgroundColor: accent, borderColor: accent }]}
                >
                  <AppText variant="smallStrong" numeric color={i === stepIndex ? '#08261B' : P.text}>
                    {formatMoney(s, currency)}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {/* buttons */}
            <View style={styles.controls}>
              <ControlButton label={`− ${formatMoney(step, currency)}`} onPress={() => changeBy(-step)} disabled={amount <= 0} a11y={`Decrease by ${formatMoney(step, currency)}`} />
              <ControlButton label={`+ ${formatMoney(step, currency)}`} onPress={() => changeBy(step)} a11y={`Increase by ${formatMoney(step, currency)}`} />
              <ControlButton label={`+ ${formatMoney(bigStep, currency)}`} onPress={() => changeBy(bigStep)} a11y={`Increase by ${formatMoney(bigStep, currency)}`} />
            </View>

            <Pressable onPress={() => setSheet('note')} style={styles.noteBtn} accessibilityRole="button" accessibilityLabel={note ? `Note: ${note}. Edit note` : 'Add a note'}>
              <StickyNote size={14} color={P.muted} />
              <AppText variant="caption" color={note ? P.text : P.muted} numberOfLines={1} style={{ maxWidth: 240 }}>
                {note || 'Add a note (optional)'}
              </AppText>
            </Pressable>

            {/* confirmation */}
            <View style={styles.confirmArea}>
              {error ? (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.errorRow}>
                  <AppText variant="smallStrong" color="#F5A39B" center accessibilityLiveRegion="assertive">
                    {error}
                  </AppText>
                  {phase === 'error' ? <RotateCcw size={14} color="#F5A39B" /> : null}
                </Animated.View>
              ) : (
                <AppText variant="small" color={P.muted} center numberOfLines={2}>
                  {goal && amount > 0
                    ? `${isW ? 'Withdraw' : 'Save'} ${formatMoney(amount, currency)} ${isW ? 'from' : 'to'} ${goal.name} · ${formatDateKey(date, 'relative')}`
                    : isW
                    ? `Available to withdraw: ${formatMoney(balance, currency)}`
                    : 'Set an amount, then swipe up or tap to save'}
                </AppText>
              )}
              <View style={styles.confirmTrack}>
                <Animated.View style={[styles.confirmZone, zoneStyle]} pointerEvents="none">
                  <Animated.View style={zoneTextStyle}>
                    <AppText variant="smallStrong" color={accent}>
                      Release to {isW ? 'withdraw' : 'save'}
                    </AppText>
                  </Animated.View>
                </Animated.View>
                <GestureDetector gesture={confirmGesture}>
                  <Animated.View
                    style={[styles.knob, { backgroundColor: accent, opacity: phase === 'saving' ? 0.7 : goal && amount > 0 ? 1 : 0.55 }, knobStyle]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={isW ? 'Save withdrawal' : 'Save contribution'}
                    accessibilityState={{ disabled: phase === 'saving', busy: phase === 'saving' }}
                    accessibilityActions={[{ name: 'activate' }]}
                    onAccessibilityAction={confirm}
                  >
                    <ChevronsUp size={22} color="#08261B" strokeWidth={2.6} />
                    <AppText variant="smallStrong" color="#08261B">
                      {phase === 'saving' ? 'Saving…' : phase === 'error' ? 'Try again' : isW ? 'Withdraw' : 'Save'}
                    </AppText>
                  </Animated.View>
                </GestureDetector>
              </View>
              <AppText variant="caption" color={P.muted} center style={{ marginTop: 6 }}>
                Swipe up or tap to {isW ? 'record the withdrawal' : 'save'}
              </AppText>
            </View>
          </>
      </Animated.View>

      <SaveAurora
        phase={phase}
        isW={isW}
        reduceMotion={reduceMotion}
        savingLabel={goal ? `${isW ? 'Recording withdrawal from' : 'Saving to'} ${goal.name}` : 'Saving'}
        title={`${isW ? 'Withdrew' : 'Saved'} ${formatMoney(amount, currency)}`}
        subtitle={goal ? `${isW ? 'from' : 'to'} ${goal.name} · ${Math.floor(savedProgress.current.to * 100)}% of target` : ''}
      />

      <KeypadSheet
        visible={sheet === 'keypad'}
        onClose={() => setSheet(null)}
        currency={currency}
        initialMinor={amount}
        onSubmit={v => {
          if (isW && v > maxAmount) {
            setError(`You can withdraw up to ${formatMoney(maxAmount, currency)}`);
            setAmount(maxAmount);
          } else {
            setAmount(Math.min(v, MAX_MINOR));
            setError(null);
          }
          setSheet(null);
          pulse();
        }}
      />
      <GoalPickerSheet
        visible={sheet === 'goal'}
        onClose={() => setSheet(null)}
        value={goalId}
        onChange={id => {
          setGoalId(id);
          setSheet(null);
          setError(null);
          fire('tick');
        }}
      />
      <DatePickerSheet
        visible={sheet === 'date'}
        onClose={() => setSheet(null)}
        value={date}
        maxDate={todayKey()}
        title={isW ? 'Withdrawal date' : 'Contribution date'}
        onChange={k => {
          setDate(k);
          setSheet(null);
        }}
      />
      <NoteSheet visible={sheet === 'note'} value={note} onClose={() => setSheet(null)} onSave={t => { setNote(t); setSheet(null); }} />
    </View>
  );
}

function TypeToggle({ value, onChange, disabled }) {
  const items = [
    { key: TX.CONTRIBUTION, label: 'Save' },
    { key: TX.WITHDRAWAL, label: 'Withdraw' },
  ];
  return (
    <View style={styles.toggle} accessibilityRole="tablist">
      {items.map(it => {
        const active = it.key === value;
        const color = it.key === TX.WITHDRAWAL ? P.withdraw : P.accent;
        return (
          <Pressable
            key={it.key}
            disabled={disabled}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.toggleItem, active && { backgroundColor: color }]}
          >
            <AppText variant="smallStrong" color={active ? '#08261B' : P.muted}>
              {it.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function RoundButton({ icon, label, onPress }) {
  return <GlassButton icon={icon} label={label} onPress={onPress} tone="dark" size={44} />;
}

function ControlButton({ label, onPress, disabled, a11y }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.control, { opacity: disabled ? 0.4 : 1, backgroundColor: pressed ? 'rgba(255,255,255,0.16)' : P.chip }]}
    >
      <Text style={styles.controlText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </Pressable>
  );
}

function NoteSheet({ visible, value, onClose, onSave }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    if (visible) {
      setText(value);
    }
  }, [visible, value]);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Note" dark>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="e.g. Skipped takeaway tonight"
        placeholderTextColor="rgba(255,255,255,0.35)"
        maxLength={280}
        autoFocus
        multiline
        style={styles.noteInput}
        accessibilityLabel="Note"
      />
      <Button title="Done" onPress={() => onSave(text.trim())} style={{ marginTop: 14 }} colorOverride={{ bg: P.accent, fg: '#08261B' }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: P.chip },
  toggle: { flexDirection: 'row', backgroundColor: P.chip, borderRadius: 999, padding: 3 },
  toggleItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, minWidth: 84, alignItems: 'center' },
  contextRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: P.chip,
    borderWidth: 1,
    borderColor: P.chipBorder,
    minHeight: 40,
  },
  dialArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, minHeight: 220 },
  amountWrap: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  amount: { fontWeight: '600', letterSpacing: -1.5, fontVariant: ['tabular-nums'], textAlign: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  stepChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: P.chipBorder, minWidth: 56, alignItems: 'center' },
  controls: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  control: { flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  controlText: { color: P.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  noteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12, minHeight: 40 },
  confirmArea: { paddingHorizontal: 16, alignItems: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmTrack: { marginTop: 10, height: 56 + CONFIRM_TRACK, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  confirmZone: {
    position: 'absolute',
    top: 0,
    width: 200,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(110,231,176,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, width: 200, borderRadius: 28 },
  noteInput: {
    minHeight: 90,
    color: P.text,
    fontSize: 16,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    textAlignVertical: 'top',
  },
});
