import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { ChevronUp, HardDrive, Plus, TrendingUp, TrendingDown, Flame, ArrowRight } from 'lucide-react-native';
import { useData } from '../../store/data';
import { usePreferences } from '../../store/preferences';
import { useTheme } from '../../theme/ThemeProvider';
import { cardGradient, DOT_COLORS } from '../../theme/tokens';
import { SectionScreen } from '../../components/screen';
import { AppText } from '../../components/ui';
import { CategoryIcon } from '../../components/goal';
import { useSections, SECTION_INDEX } from '../../navigation/sectionContext';
import { activeSavingsTotal, sortTransactionsDesc, STATUS, TX } from '../../services/calculations';
import { currentStreak, summarize } from '../../services/analytics';
import { useHaptics } from '../../services/haptics';
import { formatMoney, getCurrency } from '../../utils/money';
import {
  addDays,
  daysInMonth,
  firstOfMonth,
  formatDateKey,
  formatTime,
  greetingFor,
  MONTHS_SHORT,
  shiftMonth,
  splitKey,
  startOfWeek,
  todayKey,
  WEEK_LABELS,
} from '../../utils/dates';

const INK = '#17221D';
const EASE = Easing.out(Easing.cubic);

/* ------------------------------------------------------------------ */

export function HomeScreen({ active }) {
  const navigation = useNavigation();
  const sections = useSections();
  const { goals, transactions, stats } = useData();
  const { prefs } = usePreferences();
  const { colors, reduceMotion } = useTheme();
  const currency = prefs.currencyCode;
  const today = todayKey();

  const visible = useMemo(() => goals.filter(g => g.status !== STATUS.ARCHIVED), [goals]);
  const total = useMemo(() => activeSavingsTotal(goals, stats), [goals, stats]);
  const targetTotal = useMemo(() => visible.reduce((s, g) => s + g.targetAmount, 0), [visible]);

  const month = useMemo(() => {
    const { y, m, d } = splitKey(today);
    const thisMonth = summarize(transactions, { from: firstOfMonth(y, m - 1), to: today });
    const prev = shiftMonth(y, m - 1, -1);
    const pFrom = firstOfMonth(prev.year, prev.month0);
    const pDays = Math.min(d, daysInMonth(prev.year, prev.month0));
    const lastMonth = summarize(transactions, { from: pFrom, to: addDays(pFrom, pDays - 1) });
    const delta =
      lastMonth.contributionTotal > 0 && thisMonth.contributionTotal > 0
        ? Math.round(((thisMonth.contributionTotal - lastMonth.contributionTotal) * 100) / lastMonth.contributionTotal)
        : null;
    return { thisMonth, delta, prevLabel: `${MONTHS_SHORT[prev.month0]} 1–${pDays}` };
  }, [transactions, today]);

  const streak = useMemo(() => currentStreak(transactions, today), [transactions, today]);

  // Most relevant first: unfinished, most recently active, then priority.
  const stack = useMemo(() => {
    const prio = { High: 3, Medium: 2, Low: 1 };
    return [...visible].sort((a, b) => {
      const ca = a.status === STATUS.COMPLETED ? 1 : 0;
      const cb = b.status === STATUS.COMPLETED ? 1 : 0;
      if (ca !== cb) {
        return ca - cb;
      }
      const la = stats.get(a.id)?.lastDate || '';
      const lb = stats.get(b.id)?.lastDate || '';
      if (la !== lb) {
        return la < lb ? 1 : -1;
      }
      return (prio[b.priority] || 0) - (prio[a.priority] || 0);
    });
  }, [visible, stats]);

  const recent = useMemo(() => sortTransactionsDesc(transactions).slice(0, 6), [transactions]);
  const goalMap = useMemo(() => new Map(goals.map(g => [g.id, g])), [goals]);
  const enter = i => (reduceMotion ? undefined : FadeInDown.delay(70 * i).duration(380).easing(EASE));

  const openDial = () =>
    navigation.navigate('SavingsDial', { goalId: visible.length === 1 ? visible[0].id : undefined, source: 'home' });

  const name = prefs.displayName ? `, ${prefs.displayName}` : '';

  /* ---------- first run ---------- */
  if (!goals.length) {
    return (
      <SectionScreen eyebrow={`${greetingFor()}${name}`}>
        <Animated.View entering={enter(0)} style={styles.px}>
          <Text style={[styles.emptyHero, { color: colors.text }]}>Your stash{'\n'}starts here.</Text>
          <AppText tone="muted" style={{ marginTop: 12, maxWidth: 320 }}>
            Add something you want — a phone, a trip, a bike — and record money as you set it aside.
          </AppText>
        </Animated.View>
        <Animated.View entering={enter(1)} style={[styles.px, { marginTop: 28 }]}>
          <Pressable
            onPress={() => navigation.navigate('GoalEditor')}
            accessibilityRole="button"
            accessibilityLabel="Create your first goal"
            style={({ pressed }) => [styles.ghostCard, { borderColor: colors.borderStrong, opacity: pressed ? 0.8 : 1 }]}
          >
            <GradientFill colors={cardGradient('Electronics')} radius={26} opacity={0.35} />
            <View style={[styles.ghostPlus, { backgroundColor: colors.text }]}>
              <Plus size={24} color={colors.background} strokeWidth={2.4} />
            </View>
            <AppText variant="h3" style={{ marginTop: 14 }}>
              Create your first goal
            </AppText>
            <AppText variant="small" tone="muted" style={{ marginTop: 4 }}>
              Takes about 20 seconds
            </AppText>
          </Pressable>
          <View style={styles.deviceNote}>
            <HardDrive size={14} color={colors.muted} />
            <AppText variant="caption" tone="muted">
              Everything stays on this device. Stashly never moves real money.
            </AppText>
          </View>
        </Animated.View>
      </SectionScreen>
    );
  }

  /* ---------- main ---------- */
  return (
    <View style={styles.flex}>
      <SectionScreen eyebrow={`${greetingFor()}${name}`} contentStyle={{ paddingBottom: 150 }}>
        {/* hero balance */}
        <Animated.View entering={enter(0)} style={styles.px}>
          <BigMoney value={total} currency={currency} color={colors.text} muted={colors.muted} animate={!reduceMotion && active !== false} />
          <AppText variant="small" tone="muted" style={{ marginTop: 2 }}>
            saved across {visible.length} {visible.length === 1 ? 'goal' : 'goals'}
            {targetTotal ? ` · ${Math.floor((Math.max(total, 0) * 100) / targetTotal)}% of ${formatMoney(targetTotal, currency, { compact: true })}` : ''}
          </AppText>
        </Animated.View>

        {/* pills */}
        <Animated.View entering={enter(1)} style={[styles.px, styles.pills]}>
          <InfoPill label="This month" value={formatMoney(month.thisMonth.contributionTotal, currency)} colors={colors} />
          {month.delta !== null ? (
            <InfoPill
              icon={month.delta >= 0 ? TrendingUp : TrendingDown}
              value={`${month.delta >= 0 ? '+' : ''}${month.delta}%`}
              label={`vs ${month.prevLabel}`}
              colors={colors}
            />
          ) : null}
          {prefs.showStreak && streak > 1 ? <InfoPill icon={Flame} value={`${streak} days`} label="streak" colors={colors} /> : null}
        </Animated.View>

        {/* week strip */}
        <Animated.View entering={enter(2)} style={[styles.px, { marginTop: 26 }]}>
          <WeekStrip transactions={transactions} today={today} onPress={() => sections.goTo(SECTION_INDEX.calendar)} />
        </Animated.View>

        {/* wallet stack */}
        <Animated.View entering={enter(3)} style={[styles.px, { marginTop: 30 }]}>
          <View style={styles.sectionHead}>
            <AppText variant="h3" accessibilityRole="header">
              Your stash
            </AppText>
            <Pressable onPress={() => sections.goTo(SECTION_INDEX.goals)} hitSlop={10} accessibilityRole="button" style={styles.link}>
              <AppText variant="smallStrong" tone="primary">
                All goals
              </AppText>
              <ArrowRight size={15} color={colors.primary} />
            </Pressable>
          </View>
          <View>
            {stack.slice(0, 5).map((g, i) => (
              <StackCard
                key={g.id}
                goal={g}
                stat={stats.get(g.id)}
                index={i}
                reduceMotion={reduceMotion}
                onPress={() => navigation.navigate('GoalDetail', { goalId: g.id })}
              />
            ))}
          </View>
          {stack.length > 5 ? (
            <Pressable onPress={() => sections.goTo(SECTION_INDEX.goals)} style={{ alignSelf: 'center', marginTop: 12 }} accessibilityRole="button">
              <AppText variant="smallStrong" tone="primary">
                +{stack.length - 5} more
              </AppText>
            </Pressable>
          ) : null}
        </Animated.View>

        {/* activity timeline */}
        <Animated.View entering={enter(4)} style={[styles.px, { marginTop: 30 }]}>
          <View style={styles.sectionHead}>
            <AppText variant="h3" accessibilityRole="header">
              Recent
            </AppText>
            {recent.length ? (
              <Pressable onPress={() => navigation.navigate('History')} hitSlop={10} accessibilityRole="button" style={styles.link}>
                <AppText variant="smallStrong" tone="primary">
                  History
                </AppText>
                <ArrowRight size={15} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
          {recent.length ? (
            <Timeline items={recent} goalMap={goalMap} colors={colors} onOpen={id => navigation.navigate('Transaction', { txId: id })} />
          ) : (
            <AppText variant="small" tone="muted">
              Nothing recorded yet. Swipe up on the bar below to save your first amount.
            </AppText>
          )}
        </Animated.View>
      </SectionScreen>

      <SaveDock
        progress={targetTotal ? Math.min(Math.max(total, 0) / targetTotal, 1) : 0}
        onOpen={openDial}
        reduceMotion={reduceMotion}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */

/** Smoothly counts up to a value on first show (ease-out, ~0.8s). */
function useCountUp(target, enabled) {
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    let raf;
    const from = 0;
    const start = Date.now();
    const dur = 800;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * e));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // count up once per mount; later changes jump straight to the new value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setValue(target);
  }, [target]);
  return value;
}

function BigMoney({ value, currency, color, muted, animate }) {
  const shown = useCountUp(value, animate);
  const cur = getCurrency(currency);
  const factor = 10 ** cur.decimals;
  // While counting, show whole units only so digits don't flicker.
  const text = formatMoney(shown === value ? value : Math.round(shown / factor) * factor, currency, { symbol: false });
  const [whole, frac] = text.split('.');
  return (
    <View
      style={styles.bigRow}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`Saved across active goals: ${formatMoney(value, currency)}`}
    >
      <Text style={[styles.bigSymbol, { color: muted }]}>{cur.symbol.trim()}</Text>
      <Text style={[styles.bigDigits, { color }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
        {value < 0 ? '−' : ''}
        {whole.replace('−', '')}
      </Text>
      {frac ? <Text style={[styles.bigFrac, { color: muted }]}>.{frac}</Text> : null}
    </View>
  );
}

function InfoPill({ icon: Icon, label, value, colors }) {
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {Icon ? <Icon size={14} color={colors.primary} strokeWidth={2.4} /> : null}
      <AppText variant="smallStrong" numeric>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

/** Monday–Sunday dots in the calendar's visual language. */
function WeekStrip({ transactions, today, onPress }) {
  const { colors, isDark } = useTheme();
  const D = DOT_COLORS[isDark ? 'dark' : 'light'];
  const start = startOfWeek(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const savedDays = useMemo(() => {
    const set = new Set();
    for (const t of transactions) {
      if (t.type === TX.CONTRIBUTION && t.date >= start && t.date <= days[6]) {
        set.add(t.date);
      }
    }
    return set;
  }, [transactions, start, days]);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`This week: saved on ${savedDays.size} of 7 days. Open calendar`}>
      <View style={styles.sectionHead}>
        <AppText variant="smallStrong" tone="secondary">
          This week
        </AppText>
        <AppText variant="caption" tone="muted">
          Saved on {savedDays.size} of 7 days
        </AppText>
      </View>
      <View style={styles.weekRow}>
        {days.map((k, i) => {
          const isToday = k === today;
          const saved = savedDays.has(k);
          const bg = isToday ? D.today : saved ? D.saved : k > today ? D.future : D.past;
          return (
            <View key={k} style={styles.weekCell}>
              <View style={[styles.weekDot, { backgroundColor: bg }]}>
                {saved && isToday ? <View style={styles.todaySaved} /> : null}
              </View>
              <AppText variant="caption" color={isToday ? D.today : colors.muted} style={{ fontWeight: '600', marginTop: 6 }}>
                {WEEK_LABELS[i]}
              </AppText>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

function GradientFill({ colors: [a, b], radius, opacity = 1 }) {
  const id = `hg${a.replace('#', '')}${b.replace('#', '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={a} stopOpacity={opacity} />
          <Stop offset="1" stopColor={b} stopOpacity={opacity} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" rx={radius / 3} fill={`url(#${id})`} />
    </Svg>
  );
}

const CARD_H = 118;
const OVERLAP = 30;

/** Goals stacked like cards in a wallet; each one overlaps the one above. */
function StackCard({ goal, stat, index, reduceMotion, onPress }) {
  const grad = cardGradient(goal.category);
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(260 + index * 70).duration(420).easing(EASE)}
      style={{ marginTop: index ? -OVERLAP : 0, zIndex: index + 1 }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${goal.name}. ${formatMoney(stat.balance, goal.currencyCode)} of ${formatMoney(goal.targetAmount, goal.currencyCode)}, ${stat.percent} percent`}
        style={({ pressed }) => [styles.stackCard, { transform: [{ translateY: pressed ? -4 : 0 }] }]}
      >
        <View style={[StyleSheet.absoluteFill, styles.stackClip]}>
          <GradientFill colors={grad} radius={24} />
        </View>
        <View style={styles.stackTop}>
          {goal.imageUri ? (
            <Image source={{ uri: goal.imageUri }} style={styles.stackThumb} />
          ) : (
            <View style={styles.stackIcon}>
              <CategoryIcon category={goal.category} size={17} color={INK} />
            </View>
          )}
          <AppText variant="bodyStrong" color={INK} numberOfLines={1} style={{ flex: 1 }}>
            {goal.name}
          </AppText>
          <Text style={styles.stackPct}>{stat.percent}%</Text>
        </View>
        <View style={styles.stackBottom}>
          <AppText variant="small" color="rgba(23,34,29,0.72)" numeric>
            {formatMoney(stat.balance, goal.currencyCode)} of {formatMoney(goal.targetAmount, goal.currencyCode)}
          </AppText>
          <View style={styles.stackBar}>
            <View style={[styles.stackBarFill, { width: `${Math.max(stat.ratio * 100, stat.balance > 0 ? 3 : 0)}%` }]} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Timeline({ items, goalMap, colors, onOpen }) {
  const today = todayKey();
  let lastDate = null;
  return (
    <View>
      {items.map((t, i) => {
        const isW = t.type === TX.WITHDRAWAL;
        const showDate = t.date !== lastDate;
        lastDate = t.date;
        const goal = goalMap.get(t.goalId);
        return (
          <View key={t.id}>
            {showDate ? (
              <AppText variant="overline" tone="muted" style={{ marginTop: i ? 14 : 0, marginBottom: 6, marginLeft: 26 }}>
                {formatDateKey(t.date, 'relative', today)}
              </AppText>
            ) : null}
            <Pressable
              onPress={() => onOpen(t.id)}
              accessibilityRole="button"
              accessibilityLabel={`${isW ? 'Withdrew' : 'Saved'} ${formatMoney(t.amount, t.currencyCode)}${goal ? ` ${isW ? 'from' : 'to'} ${goal.name}` : ''}`}
              style={({ pressed }) => [styles.tlRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={styles.tlRail}>
                <View style={[styles.tlLine, { backgroundColor: colors.border }]} />
                <View style={[styles.tlDot, { backgroundColor: isW ? colors.withdraw : colors.text, borderColor: colors.background }]} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" numeric color={isW ? colors.withdraw : colors.text}>
                  {isW ? '−' : '+'}
                  {formatMoney(t.amount, t.currencyCode)}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {goal?.name || 'Goal'}
                  {t.note ? ` · ${t.note}` : ''}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                {formatTime(t.createdAt)}
              </AppText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */

const DOCK_H = 74;
const TRIGGER = 56;

/**
 * Floating "swipe up to save" dock. Drag it up (or tap) to open the Savings Dial.
 * Lives outside the scroll view, so scrolling Home never triggers it.
 */
function SaveDock({ progress, onOpen, reduceMotion }) {
  const insets = useSafeAreaInsets();
  const { fire } = useHaptics();
  const y = useSharedValue(0);
  const hint = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    hint.value = withRepeat(
      withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })),
      -1,
      false,
    );
  }, [reduceMotion, hint]);

  const open = () => {
    fire('medium');
    onOpen();
  };

  const gesture = Gesture.Exclusive(
    Gesture.Pan()
      .activeOffsetY([-8, 8])
      .failOffsetX([-16, 16])
      .onUpdate(e => {
        // follow the finger upwards with gentle resistance
        const dy = Math.min(0, e.translationY);
        y.value = -Math.pow(-dy, 0.85);
      })
      .onEnd(() => {
        if (y.value < -TRIGGER * 0.75) {
          scheduleOnRN(open);
        }
        y.value = withTiming(0, { duration: 260, easing: EASE });
      }),
    Gesture.Tap().onEnd((_e, ok) => {
      if (ok) {
        scheduleOnRN(open);
      }
    }),
  );

  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: interpolate(-y.value, [0, TRIGGER], [1, 1.03], 'clamp') }],
  }));
  const chevStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * hint.value + y.value * 0.15 }],
    opacity: interpolate(hint.value, [0, 1], [0.55, 1]),
  }));

  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.delay(350).duration(400)}
      pointerEvents="box-none"
      style={[styles.dockWrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.dock, dockStyle]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Add savings"
          accessibilityHint="Opens the Savings Dial"
        >
          <View style={[StyleSheet.absoluteFill, { borderRadius: DOCK_H / 2, overflow: 'hidden' }]}>
            <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
              <Defs>
                <LinearGradient id="dockg" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#14533D" />
                  <Stop offset="1" stopColor="#0A2A1F" />
                </LinearGradient>
                <LinearGradient id="docks" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
                  <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="100" height="100" fill="url(#dockg)" />
              <Rect width="100" height="100" fill="url(#docks)" />
            </Svg>
          </View>
          <Svg width={48} height={48}>
            <Circle cx={24} cy={24} r={r} stroke="rgba(255,255,255,0.14)" strokeWidth={5} fill="none" />
            <Circle
              cx={24}
              cy={24}
              r={r}
              stroke="#6EE7B0"
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${c} ${c}`}
              strokeDashoffset={c * (1 - progress)}
              transform="rotate(-90 24 24)"
            />
          </Svg>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong" color="#F3F7F3">
              Add savings
            </AppText>
            <AppText variant="caption" color="#9FC3B2">
              Swipe up or tap
            </AppText>
          </View>
          <Animated.View style={[styles.dockChev, chevStyle]}>
            <ChevronUp size={22} color="#08261B" strokeWidth={2.8} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  px: { paddingHorizontal: 20 },
  bigRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bigSymbol: { fontSize: 34, lineHeight: 44, fontWeight: '300', marginTop: 10, marginRight: 4 },
  bigDigits: { fontSize: 72, lineHeight: 80, fontWeight: '800', letterSpacing: -3.5, fontVariant: ['tabular-nums'], flexShrink: 1 },
  bigFrac: { fontSize: 30, lineHeight: 40, fontWeight: '300', marginTop: 12, fontVariant: ['tabular-nums'] },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCell: { alignItems: 'center', flex: 1 },
  weekDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  todaySaved: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  stackCard: {
    height: CARD_H,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#0E2A20',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
    backgroundColor: '#DDE6E0',
  },
  stackClip: { borderRadius: 24, overflow: 'hidden' },
  stackTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stackIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  stackThumb: { width: 32, height: 32, borderRadius: 10 },
  stackPct: { fontSize: 22, fontWeight: '800', color: INK, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  stackBottom: { gap: 8, marginBottom: OVERLAP - 12 },
  stackBar: { height: 5, borderRadius: 3, backgroundColor: 'rgba(23,34,29,0.14)', overflow: 'hidden' },
  stackBarFill: { height: 5, borderRadius: 3, backgroundColor: INK },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  tlRail: { width: 14, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  tlLine: { position: 'absolute', top: -8, bottom: -8, width: 2, borderRadius: 1 },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  emptyHero: { fontSize: 52, lineHeight: 56, fontWeight: '800', letterSpacing: -2 },
  ghostCard: { height: 200, borderRadius: 26, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ghostPlus: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  deviceNote: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 18 },
  dockWrap: { position: 'absolute', left: 16, right: 16 },
  dock: {
    height: DOCK_H,
    borderRadius: DOCK_H / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 13,
    paddingRight: 13,
    shadowColor: '#0A2A1F',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    backgroundColor: '#0F3F2E',
  },
  dockChev: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6EE7B0', alignItems: 'center', justifyContent: 'center' },
});
