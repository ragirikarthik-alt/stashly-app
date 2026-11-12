import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Gesture, GestureDetector, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { LayoutGrid, GalleryHorizontal, Plus, CalendarCheck, Hand, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useData } from '../../store/data';
import { usePreferences } from '../../store/preferences';
import { useTheme } from '../../theme/ThemeProvider';
import { SectionScreen } from '../../components/screen';
import { AppText, Button, Segmented, Surface, PressableScale } from '../../components/ui';
import { DotMonthGrid, intensity } from '../../components/calendar';
import { GlassButton } from '../../components/glass';
import { TransactionRow } from '../../components/goal';
import { useSections } from '../../navigation/sectionContext';
import { dailyTotals, sortTransactionsDesc } from '../../services/calculations';
import { summarize } from '../../services/analytics';
import { formatMoney } from '../../utils/money';
import {
  addDays,
  firstOfMonth,
  daysInMonth,
  formatDateKey,
  monthDays,
  shiftMonth,
  splitKey,
  todayKey,
  WEEKDAYS_SHORT,
  weekdayOf,
  MONTHS,
} from '../../utils/dates';
import { useHaptics } from '../../services/haptics';

const NODE_W = 52;

export function CalendarScreen() {
  const navigation = useNavigation();
  const { transactions, goals } = useData();
  const { prefs, update } = usePreferences();
  const { reduceMotion, colors } = useTheme();
  const { width } = useWindowDimensions();
  const today = todayKey();
  const t0 = splitKey(today);
  const [cursor, setCursor] = useState({ year: t0.y, month0: t0.m - 1 });
  const [selected, setSelected] = useState(today);
  const mode = prefs.calendarMode;
  const currency = prefs.currencyCode;

  const daily = useMemo(() => dailyTotals(transactions), [transactions]);
  const goalMap = useMemo(() => new Map(goals.map(g => [g.id, g])), [goals]);

  const monthFrom = firstOfMonth(cursor.year, cursor.month0);
  const monthTo = addDays(monthFrom, daysInMonth(cursor.year, cursor.month0) - 1);
  const summary = useMemo(() => summarize(transactions, { from: monthFrom, to: monthTo }), [transactions, monthFrom, monthTo]);

  const dayTxs = useMemo(() => sortTransactionsDesc(transactions.filter(t => t.date === selected)), [transactions, selected]);
  const dayTotals = daily.get(selected);

  const shift = delta => {
    setCursor(c => {
      const n = shiftMonth(c.year, c.month0, delta);
      // keep a sensible selection inside the visible month
      const isCurrent = n.year === t0.y && n.month0 === t0.m - 1;
      setSelected(isCurrent ? today : firstOfMonth(n.year, n.month0));
      return n;
    });
  };

  const goToday = () => {
    setCursor({ year: t0.y, month0: t0.m - 1 });
    setSelected(today);
  };

  const select = useCallback(k => {
    setSelected(k);
  }, []);

  const isCurrentMonth = cursor.year === t0.y && cursor.month0 === t0.m - 1;

  return (
    <SectionScreen eyebrow="Calendar">
      {/* big-date hero */}
      <View style={styles.px} accessible accessibilityRole="header" accessibilityLabel={formatDateKey(selected, 'long')}>
        <Animated.Text
          key={selected}
          entering={reduceMotion ? undefined : FadeIn.duration(180)}
          style={[styles.bigDay, { color: colors.text }]}
          maxFontSizeMultiplier={1.1}
        >
          {Number(selected.slice(8))}
        </Animated.Text>
        <View style={styles.monthRow}>
          <AppText style={[styles.monthName, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {MONTHS[cursor.month0].toUpperCase()}
          </AppText>
          <AppText style={[styles.weekday, { color: colors.text }]}>{WEEKDAYS_SHORT[weekdayOf(selected)]}</AppText>
        </View>
        <View style={styles.yearRow}>
          <AppText style={[styles.year, { color: colors.muted }]}>{cursor.year}</AppText>
          <View style={styles.navRow}>
            {!isCurrentMonth || selected !== today ? (
              <Animated.View entering={reduceMotion ? undefined : FadeIn} exiting={reduceMotion ? undefined : FadeOut}>
                <GlassButton icon={CalendarCheck} label="Back to today" onPress={goToday} size={40} iconSize={18} />
              </Animated.View>
            ) : null}
            <GlassButton icon={ChevronLeft} label="Previous month" onPress={() => shift(-1)} size={40} iconSize={18} />
            <GlassButton icon={ChevronRight} label="Next month" onPress={() => shift(1)} size={40} iconSize={18} />
          </View>
        </View>
        <Segmented
          dense
          style={{ marginTop: 18 }}
          value={mode}
          onChange={m => update({ calendarMode: m })}
          options={[
            { key: 'month', label: 'Month', icon: LayoutGrid },
            { key: 'timeline', label: 'Timeline', icon: GalleryHorizontal },
          ]}
        />
      </View>

      {mode === 'month' ? (
        <View style={[styles.px, { marginTop: 16 }]}>
          <DotMonthGrid
            year={cursor.year}
            month0={cursor.month0}
            selected={selected}
            onSelect={select}
            daily={daily}
            width={width - 40}
            currency={currency}
          />
        </View>
      ) : (
        <Timeline
          year={cursor.year}
          month0={cursor.month0}
          daily={daily}
          selected={selected}
          onSelect={select}
          currency={currency}
          today={today}
        />
      )}

      {/* month summary */}
      <View style={[styles.px, { marginTop: 18 }]}>
        <Surface style={styles.summary}>
          <SummaryItem label="Saved" value={formatMoney(summary.contributionTotal, currency, { compact: summary.contributionTotal >= 1e9 })} />
          <SummaryItem label="Saving days" value={String(summary.activeDays)} />
          <SummaryItem label="Entries" value={String(summary.entries)} />
          {summary.withdrawals ? <SummaryItem label="Withdrawn" value={formatMoney(summary.withdrawalTotal, currency)} tone="withdraw" /> : null}
        </Surface>
      </View>

      {/* day panel */}
      <Animated.View key={selected} entering={reduceMotion ? undefined : FadeIn.duration(200)} style={[styles.px, { marginTop: 18 }]}>
        <Surface>
          <View style={styles.dayHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3" accessibilityRole="header">
                {formatDateKey(selected, 'relative') === 'Today' ? `Today · ${formatDateKey(selected, 'short')}` : formatDateKey(selected, 'long')}
              </AppText>
              <AppText variant="caption" tone="muted" numeric style={{ marginTop: 2 }}>
                {dayTotals
                  ? `Net ${formatMoney(dayTotals.net, currency, { sign: true })} · ${dayTotals.count} ${dayTotals.count === 1 ? 'entry' : 'entries'}`
                  : selected > today
                  ? 'Upcoming day'
                  : 'No entries on this day'}
              </AppText>
            </View>
            {selected <= today && goals.length ? (
              <Button
                title="Add"
                icon={Plus}
                size="sm"
                accessibilityLabel={`Add savings on ${formatDateKey(selected, 'long')}`}
                onPress={() => navigation.navigate('SavingsDial', { date: selected, source: 'calendar' })}
              />
            ) : null}
          </View>
          {dayTxs.length ? (
            <View style={{ marginTop: 6 }}>
              {dayTxs.map(t => (
                <TransactionRow key={t.id} tx={t} goal={goalMap.get(t.goalId)} showDate={false} onPress={() => navigation.navigate('Transaction', { txId: t.id })} />
              ))}
            </View>
          ) : selected > today ? (
            <AppText variant="small" tone="muted" style={{ marginTop: 10 }}>
              Entries can be recorded for today or earlier.
            </AppText>
          ) : null}
        </Surface>
      </Animated.View>
    </SectionScreen>
  );
}

function SummaryItem({ label, value, tone }) {
  return (
    <View style={{ flex: 1, minWidth: '22%' }}>
      <AppText variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" numeric tone={tone} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

/**
 * Horizontal savings timeline. Every date is a node (empty dates stay visible).
 * Node size/intensity reflects net activity. Long-press then drag to scrub and
 * preview daily totals; tap a node to select it.
 */
function Timeline({ year, month0, daily, selected, onSelect, currency, today }) {
  const { colors, reduceMotion } = useTheme();
  const sections = useSections();
  const { fire } = useHaptics();
  const days = useMemo(() => monthDays(year, month0), [year, month0]);
  const max = useMemo(() => days.reduce((m, k) => Math.max(m, daily.get(k)?.net ?? 0), 0), [days, daily]);
  const scrollRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const lastIdx = useRef(-1);

  useEffect(() => {
    const idx = days.indexOf(selected);
    const target = idx >= 0 ? idx : days.indexOf(today);
    if (target >= 0) {
      const id = setTimeout(() => scrollRef.current?.scrollTo({ x: Math.max(0, target * NODE_W - 120), animated: !reduceMotion }), 60);
      return () => clearTimeout(id);
    }
  }, [days, selected, today, reduceMotion]);

  const indexAt = x => Math.max(0, Math.min(days.length - 1, Math.floor(x / NODE_W)));

  const scrub = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(220)
    .onStart(e => {
      sections?.setSwipeEnabled(false);
      fire('light');
      const i = indexAt(e.x);
      lastIdx.current = i;
      setPreview(days[i]);
    })
    .onUpdate(e => {
      const i = indexAt(e.x);
      if (i !== lastIdx.current) {
        lastIdx.current = i;
        fire('tick');
        setPreview(days[i]);
      }
    })
    .onEnd(() => {
      if (lastIdx.current >= 0) {
        onSelect(days[lastIdx.current]);
      }
    })
    .onFinalize(() => {
      sections?.setSwipeEnabled(true);
      setPreview(null);
      lastIdx.current = -1;
    });

  const shown = preview || selected;
  const shownTotals = daily.get(shown);

  return (
    <View style={{ marginTop: 12 }}>
      <View style={[styles.previewBar, { marginHorizontal: 20, backgroundColor: preview ? colors.primarySoft : colors.surfaceAlt }]} accessibilityLiveRegion="polite">
        {preview ? <Hand size={14} color={colors.primary} /> : null}
        <AppText variant="smallStrong" numberOfLines={1} style={{ flex: 1 }}>
          {formatDateKey(shown, 'medium')}
        </AppText>
        <AppText variant="smallStrong" numeric tone={shownTotals?.net < 0 ? 'withdraw' : 'primary'}>
          {shownTotals ? formatMoney(shownTotals.net, currency, { sign: true }) : '—'}
        </AppText>
      </View>
      <GHScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        nestedScrollEnabled
      >
        <GestureDetector gesture={scrub}>
          <View style={styles.timelineRow}>
            <View style={[styles.axis, { backgroundColor: colors.border }]} />
            {days.map(k => {
              const d = daily.get(k);
              const net = d?.net ?? 0;
              const level = intensity(net, max);
              const size = level ? 14 + level * 7 : 10;
              const isSel = k === selected;
              const isPrev = k === preview;
              const isToday = k === today;
              const future = k > today;
              return (
                <PressableScale
                  key={k}
                  onPress={() => onSelect(k)}
                  scaleTo={0.92}
                  accessibilityLabel={`${formatDateKey(k, 'long')}${isToday ? ', today' : ''}. ${d ? `Net ${formatMoney(net, currency)}` : 'No entries'}`}
                  accessibilityState={{ selected: isSel }}
                  style={[styles.node, { width: NODE_W }]}
                >
                  <AppText variant="caption" tone={isToday ? 'primary' : 'muted'}>
                    {WEEKDAYS_SHORT[weekdayOf(k)].slice(0, 2)}
                  </AppText>
                  <View style={styles.nodeDotWrap}>
                    {isSel || isPrev ? <View style={[styles.nodeRing, { borderColor: colors.primary }]} /> : null}
                    <View
                      style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: level ? colors.heat[level] : future ? 'transparent' : colors.surfaceAlt,
                        borderWidth: level ? 0 : 1.5,
                        borderColor: future ? colors.border : colors.borderStrong,
                      }}
                    />
                    {d?.withdraw ? <View style={[styles.wMark, { backgroundColor: colors.withdraw }]} /> : null}
                  </View>
                  <AppText variant="smallStrong" numeric color={isSel ? colors.primary : future ? colors.faint : colors.text}>
                    {Number(k.slice(8))}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>
        </GestureDetector>
      </GHScrollView>
      <AppText variant="caption" tone="muted" center style={{ marginTop: 4 }}>
        Tap a day · press and hold, then drag to preview totals
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  px: { paddingHorizontal: 20 },
  bigDay: { fontSize: 132, lineHeight: 138, fontWeight: '800', letterSpacing: -8, fontVariant: ['tabular-nums'], marginLeft: -6 },
  monthRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  monthName: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
  weekday: { fontSize: 32, lineHeight: 38, fontWeight: '300' },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  year: { fontSize: 32, lineHeight: 38, fontWeight: '300' },
  navRow: { flexDirection: 'row', gap: 8 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginBottom: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  axis: { position: 'absolute', left: 0, right: 0, top: '50%', height: 2, borderRadius: 1 },
  node: { alignItems: 'center', gap: 6, paddingVertical: 6 },
  nodeDotWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  nodeRing: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 2 },
  wMark: { position: 'absolute', bottom: 2, width: 6, height: 6, borderRadius: 3 },
});
