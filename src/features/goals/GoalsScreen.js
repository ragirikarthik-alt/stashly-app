import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { Plus, Target, Trophy, Archive, ChevronsUp, ArrowRight } from 'lucide-react-native';
import { useData } from '../../store/data';
import { useTheme } from '../../theme/ThemeProvider';
import { categoryMeta } from '../../theme/tokens';
import { SectionScreen } from '../../components/screen';
import { AppText, EmptyState, PressableScale, Segmented } from '../../components/ui';
import { CategoryIcon } from '../../components/goal';
import { STATUS } from '../../services/calculations';
import { formatMoney } from '../../utils/money';
import { formatDateKey } from '../../utils/dates';
import { usePreferences } from '../../store/preferences';
import { useHaptics } from '../../services/haptics';

const GAP = 14;

export function GoalsScreen({ params }) {
  const navigation = useNavigation();
  const { goals, stats } = useData();
  const { prefs } = usePreferences();
  const { colors, reduceMotion } = useTheme();
  const { fire } = useHaptics();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('active');
  const [index, setIndex] = useState(0);
  const scrollX = useSharedValue(0);

  useEffect(() => {
    if (params?.filter) {
      setFilter(params.filter);
    }
  }, [params]);

  const groups = useMemo(
    () => ({
      active: goals.filter(g => g.status === STATUS.ACTIVE),
      reached: goals.filter(g => g.status === STATUS.COMPLETED),
      archived: goals.filter(g => g.status === STATUS.ARCHIVED),
    }),
    [goals],
  );
  const list = groups[filter];

  const CARD_W = Math.min(Math.round(width * 0.64), 280);
  const CARD_H = Math.round(CARD_W * 1.36);
  const ITEM = CARD_W + GAP;
  const sidePad = (width - CARD_W) / 2;

  useEffect(() => {
    setIndex(0);
    scrollX.value = 0;
  }, [filter, scrollX]);

  const onIndex = useCallback(
    i => {
      setIndex(i);
      fire('tick');
    },
    [fire],
  );

  const onScroll = useAnimatedScrollHandler(e => {
    scrollX.value = e.contentOffset.x;
  });

  useAnimatedReaction(
    () => Math.round(scrollX.value / ITEM),
    (i, prev) => {
      if (prev !== null && i !== prev) {
        scheduleOnRN(onIndex, i);
      }
    },
  );

  const current = list[Math.min(index, list.length - 1)];
  const cStat = current ? stats.get(current.id) : null;

  const empty = {
    active: {
      icon: Target,
      title: goals.length ? 'No active goals' : 'Start your collection',
      message: goals.length ? 'Everything is reached or archived. Add something new to work toward.' : 'Add the things you’re saving for. Each goal tracks its own progress.',
      action: 'New goal',
    },
    reached: { icon: Trophy, title: 'Nothing reached yet', message: 'Goals move here when your savings reach the target.' },
    archived: { icon: Archive, title: 'No archived goals', message: 'Archive a goal to tuck it away. Its history is kept and it can be restored.' },
  }[filter];

  return (
    <SectionScreen title="Goals">
      <View style={styles.px}>
        <Segmented
          dense
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'active', label: `Active ${groups.active.length || ''}`.trim(), a11y: `Active, ${groups.active.length}` },
            { key: 'reached', label: `Reached ${groups.reached.length || ''}`.trim(), a11y: `Reached, ${groups.reached.length}` },
            { key: 'archived', label: `Archived ${groups.archived.length || ''}`.trim(), a11y: `Archived, ${groups.archived.length}` },
          ]}
        />
      </View>

      <View style={styles.plusRow}>
        <PressableScale
          onPress={() => navigation.navigate('GoalEditor')}
          accessibilityLabel="New goal"
          scaleTo={0.92}
          style={[styles.plus, { backgroundColor: colors.text }]}
        >
          <Plus size={22} color={colors.background} strokeWidth={2.4} />
        </PressableScale>
      </View>

      {list.length ? (
        <>
          <Animated.FlatList
            key={filter}
            data={list}
            horizontal
            keyExtractor={g => g.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM}
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={onScroll}
            scrollEventThrottle={16}
            nestedScrollEnabled
            contentContainerStyle={{ paddingHorizontal: sidePad - GAP / 2, paddingVertical: 24 }}
            style={{ height: CARD_H + 48 }}
            renderItem={({ item, index: i }) => (
              <GoalSlide
                goal={item}
                stat={stats.get(item.id)}
                i={i}
                scrollX={scrollX}
                ITEM={ITEM}
                w={CARD_W}
                h={CARD_H}
                reduceMotion={reduceMotion}
                onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })}
              />
            )}
          />

          {current && cStat ? (
            <Animated.View key={current.id} entering={reduceMotion ? undefined : FadeIn.duration(220)} style={styles.summary}>
              <AppText variant="small" tone="muted">
                Saved for {current.name}
              </AppText>
              <AppText style={styles.balance} numeric adjustsFontSizeToFit numberOfLines={1}>
                {formatMoney(cStat.balance, current.currencyCode)}
              </AppText>
              <AppText variant="small" tone="muted" numeric>
                of {formatMoney(current.targetAmount, current.currencyCode)} · {cStat.percent}%
                {current.targetDate ? ` · by ${formatDateKey(current.targetDate, 'short')}` : ''}
              </AppText>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => navigation.navigate('GoalDetail', { goalId: current.id })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? colors.border : colors.surfaceAlt }]}
                >
                  <AppText variant="smallStrong">See goal details</AppText>
                  <ArrowRight size={16} color={colors.text} />
                </Pressable>
                {filter !== 'archived' ? (
                  <Pressable
                    onPress={() => navigation.navigate('SavingsDial', { goalId: current.id, source: 'goals' })}
                    accessibilityRole="button"
                    accessibilityLabel={`Add savings to ${current.name}`}
                    style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}
                  >
                    <ChevronsUp size={16} color={colors.onPrimary} />
                    <AppText variant="smallStrong" color={colors.onPrimary}>
                      Add
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
              {list.length > 1 ? (
                <View style={styles.dots} accessibilityLabel={`Goal ${index + 1} of ${list.length}`} accessible>
                  {list.map((g, i) => (
                    <View key={g.id} style={[styles.dot, { backgroundColor: i === index ? colors.text : colors.borderStrong, width: i === index ? 16 : 6 }]} />
                  ))}
                </View>
              ) : null}
            </Animated.View>
          ) : null}
          {filter === 'archived' ? (
            <AppText variant="caption" tone="muted" center style={{ marginTop: 16, paddingHorizontal: 32 }}>
              Archived goals aren’t counted in your Home total but stay in your history and Insights.
            </AppText>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          message={empty.message}
          action={empty.action}
          onAction={() => navigation.navigate('GoalEditor')}
          style={{ marginTop: 12 }}
        />
      )}
      <View style={{ height: 8 }} />
      <AppText variant="caption" tone="muted" center>
        {groups.active.length
          ? `${formatMoney(groups.active.reduce((s, g) => s + (stats.get(g.id)?.balance ?? 0), 0), prefs.currencyCode)} saved across active goals`
          : ''}
      </AppText>
    </SectionScreen>
  );
}

/**
 * One goal as a product card in the brand style (deep-green glass, product
 * imagery, bold progress pill). Neighbours tilt away in 3D and shrink.
 */
function GoalSlide({ goal, stat, i, scrollX, ITEM, w, h, reduceMotion, onPress }) {
  const hue = categoryMeta(goal.category).hue;
  const style = useAnimatedStyle(() => {
    const pos = (scrollX.value - i * ITEM) / ITEM; // 0 = centred, -1 right neighbour, 1 left neighbour
    const scale = interpolate(Math.abs(pos), [0, 1], [1, 0.84], Extrapolation.CLAMP);
    if (reduceMotion) {
      return { transform: [{ scale }] };
    }
    return {
      opacity: interpolate(Math.abs(pos), [0, 1, 2], [1, 0.8, 0.35], Extrapolation.CLAMP),
      transform: [
        { perspective: 900 },
        { translateX: interpolate(pos, [-1, 0, 1], [-w * 0.1, 0, w * 0.1], Extrapolation.CLAMP) },
        { rotateY: `${interpolate(pos, [-1, 0, 1], [-30, 0, 30], Extrapolation.CLAMP)}deg` },
        { scale },
      ],
    };
  });
  const pct = Math.max(stat.ratio * 100, stat.balance > 0 ? 4 : 0);
  const reached = stat.balance >= goal.targetAmount;
  const id = `gs${goal.id.replace(/\W/g, '')}`;
  return (
    <Animated.View style={[{ width: w, marginHorizontal: GAP / 2 }, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${goal.name}. ${formatMoney(stat.balance, goal.currencyCode)} of ${formatMoney(goal.targetAmount, goal.currencyCode)}, ${stat.percent} percent. Open details`}
        style={[styles.card, { width: w, height: h }]}
      >
        {/* glass body */}
        <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
          <Defs>
            <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset="0" stopColor="#2A7A5B" />
              <Stop offset="0.55" stopColor="#164A37" />
              <Stop offset="1" stopColor="#0C2E22" />
            </LinearGradient>
            <RadialGradient id={`${id}g`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={hue} stopOpacity={0.55} />
              <Stop offset="1" stopColor={hue} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
              <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#B9F5DA" stopOpacity={0.7} />
              <Stop offset="0.5" stopColor="#B9F5DA" stopOpacity={0.12} />
              <Stop offset="1" stopColor="#B9F5DA" stopOpacity={0.3} />
            </LinearGradient>
          </Defs>
          <Rect width={w} height={h} rx={28} fill={`url(#${id}b)`} />
          <Ellipse cx={w / 2} cy={h * 0.36} rx={w * 0.62} ry={w * 0.55} fill={`url(#${id}g)`} />
          <Rect width={w} height={h} rx={28} fill={`url(#${id}s)`} />
          <Rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={27.5} fill="none" stroke={`url(#${id}r)`} strokeWidth={1.5} />
        </Svg>

        <View style={styles.cardTop}>
          <View style={styles.cardIcon}>
            <CategoryIcon category={goal.category} size={16} color="#E8FFF4" />
          </View>
          {reached ? (
            <View style={styles.reached}>
              <AppText variant="caption" color="#08261B" style={{ fontWeight: '800' }}>
                REACHED
              </AppText>
            </View>
          ) : goal.targetDate ? (
            <AppText variant="caption" color="rgba(232,255,244,0.7)">
              by {formatDateKey(goal.targetDate, 'short')}
            </AppText>
          ) : null}
        </View>

        <View style={styles.cardMid}>
          {goal.imageUri ? (
            <Image source={{ uri: goal.imageUri }} style={[styles.cardImage, { width: w * 0.66, height: w * 0.66 }]} resizeMode="cover" />
          ) : (
            <CategoryIcon category={goal.category} size={w * 0.36} color="rgba(232,255,244,0.85)" />
          )}
        </View>

        <View>
          <AppText style={styles.cardName} numberOfLines={2}>
            {goal.name}
          </AppText>
          <AppText style={styles.cardAmount} numeric numberOfLines={1}>
            {formatMoney(stat.balance, goal.currencyCode)} / {formatMoney(goal.targetAmount, goal.currencyCode)}
          </AppText>
          <View style={styles.cardBarRow}>
            <View style={styles.cardBar}>
              <View style={[styles.cardBarFill, { width: `${pct}%` }]}>
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 10">
                  <Defs>
                    <LinearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#6EE7B0" />
                      <Stop offset="1" stopColor="#F1FFF8" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100" height="10" fill={`url(#${id}p)`} />
                </Svg>
              </View>
            </View>
            <AppText style={styles.cardPct} numeric>
              {stat.percent}%
            </AppText>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  px: { paddingHorizontal: 20 },
  plusRow: { alignItems: 'center', marginTop: 18 },
  plus: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: 28,
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: '#06261B',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
    backgroundColor: '#164A37',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reached: { backgroundColor: '#6EE7B0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  cardMid: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardImage: { borderRadius: 22 },
  cardName: { color: '#F3F7F3', fontSize: 19, lineHeight: 24, fontWeight: '700', fontStyle: 'italic', letterSpacing: -0.2 },
  cardAmount: { color: 'rgba(232,255,244,0.88)', fontSize: 15, fontWeight: '600', fontStyle: 'italic', marginTop: 4, fontVariant: ['tabular-nums'] },
  cardBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  cardBar: { flex: 1, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  cardBarFill: { height: 12, borderRadius: 6, overflow: 'hidden' },
  cardPct: { color: '#F3F7F3', fontSize: 15, fontWeight: '700', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
  summary: { alignItems: 'center', paddingHorizontal: 24, marginTop: 4 },
  balance: { fontSize: 46, lineHeight: 54, fontWeight: '700', letterSpacing: -1.2, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 18, borderRadius: 22 },
  dots: { flexDirection: 'row', gap: 5, marginTop: 18 },
  dot: { height: 6, borderRadius: 3 },
});
