/**
 * Onboarding: three animated "how it works" pages, then personalisation and
 * the optional daily reminder. Illustrations are driven by the swipe itself
 * (parallax, fan-out, fill) plus gentle looping motion while a page is shown.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronsUp, Smartphone, Plane, Bike, BellRing } from 'lucide-react-native';
import { usePreferences } from '../../store/preferences';
import { useData } from '../../store/data';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui';
import { GlassButton } from '../../components/glass';
import { TimeStepper } from '../../components/timePicker';
import { CURRENCIES, formatMoney, majorToMinor } from '../../utils/money';
import { formatReminderTime, requestReminderPermission, scheduleDailyReminder } from '../../services/reminders';
import { useHaptics } from '../../services/haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const EASE = Easing.inOut(Easing.cubic);
const MINT = '#6EE7B0';

const PAGES = [
  { key: 'goals', title: 'Turn wants into goals', body: 'A phone, a trip, a bike. Give each one a target and watch it fill up.' },
  { key: 'dial', title: 'Swipe up to save', body: 'Set money aside anywhere you like, then record it in a single swipe on the Savings Dial.' },
  { key: 'calendar', title: 'Watch it add up', body: 'Your calendar, insights and honest estimates show exactly how far you’ve come.' },
  { key: 'you', title: 'Make it yours', body: 'Just two quick things. You can change them any time in Settings.' },
  { key: 'reminder', title: 'A gentle nudge', body: 'Get one calm reminder a day to stash something. Never a guilt trip.' },
];

/* ---------------- illustrations ---------------- */

function GoalsArt({ p }) {
  const cards = [
    { icon: Smartphone, name: 'New phone', pct: 0.62, x: -1 },
    { icon: Bike, name: 'Road bike', pct: 0.38, x: 1 },
    { icon: Plane, name: 'Goa trip', pct: 0.8, x: 0 },
  ];
  return (
    <View style={styles.art}>
      {cards.map((c, i) => (
        <GoalArtCard key={c.name} card={c} p={p} index={i} />
      ))}
    </View>
  );
}

function GoalArtCard({ card, p, index }) {
  const s = useAnimatedStyle(() => {
    const t = interpolate(Math.abs(p.value), [0, 1], [1, 0], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: card.x * 82 * t + p.value * -40 * (index + 1) },
        { translateY: (card.x === 0 ? -18 : 12) * t },
        { rotate: `${card.x * 12 * t}deg` },
        { scale: 0.86 + 0.14 * t },
      ],
      opacity: 0.3 + 0.7 * t,
    };
  });
  const fill = useAnimatedStyle(() => {
    const t = interpolate(Math.abs(p.value), [0, 0.8], [1, 0], Extrapolation.CLAMP);
    return { width: `${Math.max(6, card.pct * 100 * t)}%` };
  });
  const Icon = card.icon;
  return (
    <Animated.View style={[styles.artCard, s]}>
      <View style={styles.artIcon}>
        <Icon size={22} color="#E8FFF4" />
      </View>
      <View style={{ flex: 1 }} />
      <AppText variant="bodyStrong" color="#F3F7F3" style={{ fontStyle: 'italic' }}>
        {card.name}
      </AppText>
      <View style={styles.artTrack}>
        <Animated.View style={[styles.artFill, fill]} />
      </View>
    </Animated.View>
  );
}

function DialArt({ active, currency }) {
  const [amount, setAmount] = useState(0);
  const arc = useSharedValue(0);
  const chev = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n = n >= 5 ? 0 : n + 1;
      setAmount(n * 100);
    }, 420);
    arc.value = withRepeat(withSequence(withTiming(0.72, { duration: 2100, easing: EASE }), withTiming(0.12, { duration: 420 })), -1, false);
    chev.value = withRepeat(withSequence(withTiming(1, { duration: 700, easing: EASE }), withTiming(0, { duration: 700, easing: EASE })), -1, false);
    return () => clearInterval(id);
  }, [active, arc, chev]);
  const W = 240;
  const r = 100;
  const len = Math.PI * r;
  const d = `M ${W / 2 - r} 120 A ${r} ${r} 0 0 1 ${W / 2 + r} 120`;
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - arc.value) }));
  const chevStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * chev.value }], opacity: 0.5 + 0.5 * chev.value }));
  return (
    <View style={styles.art}>
      <Svg width={W} height={140}>
        <Path d={d} stroke="rgba(255,255,255,0.1)" strokeWidth={14} strokeLinecap="round" fill="none" />
        <AnimatedPath d={d} stroke={MINT} strokeWidth={14} strokeLinecap="round" fill="none" strokeDasharray={`${len} ${len}`} animatedProps={props} />
      </Svg>
      <Text style={styles.artAmount}>{formatMoney(majorToMinor(amount, currency), currency)}</Text>
      <Animated.View style={[styles.artKnob, chevStyle]}>
        <ChevronsUp size={22} color="#08261B" strokeWidth={2.6} />
        <AppText variant="smallStrong" color="#08261B">
          Save
        </AppText>
      </Animated.View>
    </View>
  );
}

function CalendarArt({ active }) {
  const [filled, setFilled] = useState(0);
  useEffect(() => {
    if (!active) {
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n = n >= 30 ? 0 : n + 1;
      setFilled(n);
    }, 110);
    return () => clearInterval(id);
  }, [active]);
  const saved = [0, 2, 3, 5, 6, 7, 9, 12, 13, 14, 16, 17, 19, 20, 21, 23, 24];
  return (
    <View style={[styles.art, { paddingHorizontal: 20 }]}>
      <Text style={styles.artBigDay}>11</Text>
      <View style={styles.dotGrid}>
        {Array.from({ length: 28 }, (_, i) => {
          const isToday = i === 24;
          const on = i < filled && saved.includes(i);
          const bg = isToday && filled > 24 ? '#FF8A3D' : on ? '#F3F7F3' : i < 24 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
          return <View key={i} style={[styles.dot, { backgroundColor: bg }]} />;
        })}
      </View>
    </View>
  );
}

/* ---------------- screen ---------------- */

export function OnboardingScreen({ navigation }) {
  const { prefs, update } = usePreferences();
  const { goals, stats } = useData();
  const { reduceMotion } = useTheme();
  const { fire } = useHaptics();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const scrollRef = useRef(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [name, setName] = useState(prefs.displayName || '');
  const [currency, setCurrency] = useState(prefs.currencyCode);
  const [remind, setRemind] = useState(true);
  const [time, setTime] = useState({ hour: prefs.reminderHour, minute: prefs.reminderMinute });
  const [finishing, setFinishing] = useState(false);

  const onScroll = useAnimatedScrollHandler(e => {
    scrollX.value = e.contentOffset.x;
  });

  // swipe progress of the first page: 0 when centred, 1 one page away
  const goalsProgress = useDerivedValue(() => scrollX.value / W);

  const goToPage = i => {
    fire('tick');
    scrollRef.current?.scrollTo({ x: i * W, animated: !reduceMotion });
    setIndex(i);
  };

  const finish = async createGoal => {
    if (finishing) {
      return;
    }
    setFinishing(true);
    let reminderEnabled = false;
    if (remind) {
      try {
        reminderEnabled = await requestReminderPermission();
        if (reminderEnabled) {
          await scheduleDailyReminder({ hour: time.hour, minute: time.minute, goals, stats });
        }
      } catch {
        reminderEnabled = false;
      }
    }
    update({
      onboarded: true,
      displayName: name.trim(),
      currencyCode: currency,
      reminderEnabled,
      reminderHour: time.hour,
      reminderMinute: time.minute,
    });
    fire('confirm');
    navigation.reset({
      index: createGoal ? 1 : 0,
      routes: createGoal ? [{ name: 'Main' }, { name: 'GoalEditor' }] : [{ name: 'Main' }],
    });
  };

  const last = PAGES.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        {index > 0 ? (
          <GlassButton icon={ArrowLeft} label="Back" tone="dark" onPress={() => goToPage(index - 1)} />
        ) : (
          <GlassButton icon={ArrowLeft} label="Back to welcome" tone="dark" onPress={() => navigation.goBack()} />
        )}
        {index < 3 ? (
          <Pressable onPress={() => goToPage(3)} hitSlop={10} accessibilityRole="button">
            <AppText variant="smallStrong" color="#9FC3B2">
              Skip
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
      >
        {PAGES.map((pg, i) => (
          <Page key={pg.key} page={pg} i={i} W={W} scrollX={scrollX}>
            {pg.key === 'goals' ? <GoalsArt p={goalsProgress} /> : null}
            {pg.key === 'dial' ? <DialArt active={index === 1 && !reduceMotion} currency={currency} /> : null}
            {pg.key === 'calendar' ? <CalendarArt active={index === 2 && !reduceMotion} /> : null}
            {pg.key === 'you' ? (
              <View style={styles.form}>
                <AppText variant="smallStrong" color="#9FC3B2" style={{ marginBottom: 8 }}>
                  What should we call you? (optional)
                </AppText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  maxLength={40}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.input}
                  accessibilityLabel="Your name, optional"
                />
                <AppText variant="smallStrong" color="#9FC3B2" style={{ marginTop: 22, marginBottom: 8 }}>
                  Currency
                </AppText>
                <View style={styles.curWrap}>
                  {Object.values(CURRENCIES).map(c => (
                    <Pressable
                      key={c.code}
                      onPress={() => {
                        setCurrency(c.code);
                        fire('tick');
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: currency === c.code }}
                      accessibilityLabel={c.name}
                      style={[styles.cur, currency === c.code && styles.curOn]}
                    >
                      <AppText variant="smallStrong" color={currency === c.code ? '#08261B' : '#D2E6DC'}>
                        {`${c.symbol.trim()} ${c.code}`}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {pg.key === 'reminder' ? (
              <View style={styles.form}>
                <View style={styles.remindRow}>
                  <View style={styles.bell}>
                    <BellRing size={20} color={MINT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" color="#F3F7F3">
                      Daily reminder
                    </AppText>
                    <AppText variant="caption" color="#9FC3B2">
                      {remind ? `Every day at ${formatReminderTime(time.hour, time.minute)}` : 'Off — you can turn it on later'}
                    </AppText>
                  </View>
                  <Switch
                    value={remind}
                    onValueChange={setRemind}
                    accessibilityLabel="Daily reminder"
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: MINT }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {remind ? (
                  <View style={{ marginTop: 18 }}>
                    <TimeStepper hour={time.hour} minute={time.minute} onChange={setTime} dark />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Page>
        ))}
      </Animated.ScrollView>

      {/* bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {PAGES.map((pg, i) => (
            <Dot key={pg.key} i={i} W={W} scrollX={scrollX} />
          ))}
        </View>
        {index < last ? (
          <Pressable onPress={() => goToPage(index + 1)} accessibilityRole="button" style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
            <AppText variant="bodyStrong" color="#08261B">
              {index === 3 ? 'Continue' : 'Next'}
            </AppText>
          </Pressable>
        ) : (
          <View style={{ gap: 6 }}>
            <Pressable onPress={() => finish(true)} disabled={finishing} accessibilityRole="button" style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
              <AppText variant="bodyStrong" color="#08261B">
                Create my first goal
              </AppText>
            </Pressable>
            <Pressable onPress={() => finish(false)} disabled={finishing} accessibilityRole="button" style={styles.ghost}>
              <AppText variant="smallStrong" color="#9FC3B2">
                Explore first
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function Page({ page, i, W, scrollX, children }) {
  const text = useAnimatedStyle(() => {
    const pos = (scrollX.value - i * W) / W;
    return {
      opacity: interpolate(Math.abs(pos), [0, 0.6], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: pos * -60 }],
    };
  });
  const art = useAnimatedStyle(() => {
    const pos = (scrollX.value - i * W) / W;
    return {
      opacity: interpolate(Math.abs(pos), [0, 0.8], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: pos * 40 }, { scale: interpolate(Math.abs(pos), [0, 1], [1, 0.9], Extrapolation.CLAMP) }],
    };
  });
  const isForm = page.key === 'you' || page.key === 'reminder';
  return (
    <ScrollView style={{ width: W }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {!isForm ? <Animated.View style={[styles.artWrap, art]}>{children}</Animated.View> : null}
      <Animated.View style={text}>
        <AppText variant="overline" color={MINT}>
          {`Step ${i + 1} of ${PAGES.length}`}
        </AppText>
        <Text style={styles.pageTitle} accessibilityRole="header">
          {page.title}
        </Text>
        <AppText variant="body" color="#B9D3C7" style={{ marginTop: 8, lineHeight: 23 }}>
          {page.body}
        </AppText>
      </Animated.View>
      {isForm ? <Animated.View style={[{ marginTop: 26 }, art]}>{children}</Animated.View> : null}
    </ScrollView>
  );
}

function Dot({ i, W, scrollX }) {
  const s = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.value / W - i);
    return {
      width: interpolate(d, [0, 1], [22, 7], Extrapolation.CLAMP),
      opacity: interpolate(d, [0, 1], [1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dotNav, s]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A231B' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  page: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 24 },
  artWrap: { height: 300, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  art: { width: '100%', height: 280, alignItems: 'center', justifyContent: 'center' },
  artCard: {
    position: 'absolute',
    width: 150,
    height: 196,
    borderRadius: 24,
    padding: 14,
    backgroundColor: '#17503C',
    borderWidth: 1,
    borderColor: 'rgba(185,245,218,0.3)',
  },
  artIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  artTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: 10, overflow: 'hidden' },
  artFill: { height: 10, borderRadius: 5, backgroundColor: MINT },
  artAmount: { color: '#F3F7F3', fontSize: 52, fontWeight: '700', letterSpacing: -1.5, marginTop: -64, fontVariant: ['tabular-nums'] },
  artKnob: { marginTop: 34, height: 48, paddingHorizontal: 26, borderRadius: 24, backgroundColor: MINT, flexDirection: 'row', alignItems: 'center', gap: 8 },
  artBigDay: { color: '#F3F7F3', fontSize: 92, lineHeight: 96, fontWeight: '800', letterSpacing: -5, alignSelf: 'flex-start' },
  dotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, width: 7 * 30 + 6 * 8 },
  dot: { width: 30, height: 30, borderRadius: 15 },
  pageTitle: { color: '#F3F7F3', fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 },
  form: {},
  input: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#F3F7F3',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  curWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cur: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.06)' },
  curOn: { backgroundColor: MINT, borderColor: MINT },
  remindRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(110,231,176,0.14)', alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 22, gap: 16 },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dotNav: { height: 7, borderRadius: 4, backgroundColor: MINT },
  cta: { height: 58, borderRadius: 29, backgroundColor: MINT, alignItems: 'center', justifyContent: 'center' },
  ghost: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
