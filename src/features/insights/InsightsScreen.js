import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  ChartColumn,
  ChevronDown,
  ChevronUp,
  Sprout,
  Coins,
  CalendarCheck,
  CalendarHeart,
  Trophy,
  Flag,
  Star,
  Lock,
} from 'lucide-react-native';
import { useData } from '../../store/data';
import { usePreferences } from '../../store/preferences';
import { useTheme } from '../../theme/ThemeProvider';
import { SectionScreen } from '../../components/screen';
import { AppText, EmptyState, SectionTitle, Segmented, Surface } from '../../components/ui';
import { ProgressBar } from '../../components/progress';
import { DonutChart, Heatmap, HeatLegend, TrendChart, useSeriesColors } from '../../components/charts';
import { activeSavingsTotal, lifetimeBalance, STATUS } from '../../services/calculations';
import { allocation, completionRate, consistency, currentStreak, longestStreak, summarize, trend } from '../../services/analytics';
import { describeMilestone, milestoneCatalog } from '../../services/milestones';
import { formatMoney } from '../../utils/money';
import { firstOfMonth, formatDateKey, MONTHS, splitKey, todayKey } from '../../utils/dates';

const MILESTONE_ICONS = { sprout: Sprout, coins: Coins, 'calendar-check': CalendarCheck, 'calendar-heart': CalendarHeart, trophy: Trophy, flag: Flag, star: Star };

export function InsightsScreen({ active }) {
  const navigation = useNavigation();
  const { goals, transactions, stats, milestones } = useData();
  const { prefs, update } = usePreferences();
  const { colors, reduceMotion } = useTheme();
  const series = useSeriesColors();
  const currency = prefs.currencyCode;
  const today = todayKey();
  const [showDefs, setShowDefs] = useState(false);

  // Charts animate on first entry to this section only.
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (active) {
      setSeen(true);
    }
  }, [active]);
  const animate = !reduceMotion;

  const { y, m } = splitKey(today);
  const monthFrom = firstOfMonth(y, m - 1);

  const data = useMemo(() => {
    const all = summarize(transactions);
    const month = summarize(transactions, { from: monthFrom, to: today });
    return {
      all,
      month,
      activeTotal: activeSavingsTotal(goals, stats),
      lifetime: lifetimeBalance(goals, stats),
      streak: currentStreak(transactions, today),
      best: longestStreak(transactions),
      completion: completionRate(goals),
      alloc: allocation(goals, transactions),
      heat: consistency(transactions, today, 16),
    };
  }, [transactions, goals, stats, monthFrom, today]);

  const range = prefs.insightsRange;
  const buckets = useMemo(() => trend(transactions, range, today), [transactions, range, today]);
  const rangeLabel = range === 'daily' ? 'Net savings · last 14 days' : range === 'weekly' ? 'Net savings · last 12 weeks' : 'Net savings · last 12 months';

  const achieved = useMemo(() => milestones.map(ms => ({ ...describeMilestone(ms.key, goals, currency), achievedAt: ms.achievedAt })).reverse(), [milestones, goals, currency]);
  const locked = useMemo(() => milestoneCatalog(currency).filter(c => !milestones.some(ms => ms.key === c.key)), [milestones, currency]);

  if (!transactions.length) {
    return (
      <SectionScreen title="Insights" subtitle="Patterns from what you’ve recorded">
        <EmptyState
          icon={ChartColumn}
          title="Insights appear as you save"
          message="Once you record a few contributions, you’ll see trends, consistency and how your savings are spread across goals."
          action={goals.length ? undefined : 'Create a goal'}
          onAction={() => navigation.navigate('GoalEditor')}
          style={{ marginTop: 20 }}
        />
      </SectionScreen>
    );
  }

  const enter = i => (reduceMotion ? undefined : FadeInDown.delay(40 * i).duration(260));
  const visibleGoals = goals.filter(g => g.status !== STATUS.ARCHIVED);

  return (
    <SectionScreen title="Insights" subtitle="Patterns from what you’ve recorded">
      {/* metrics */}
      <Animated.View entering={enter(0)} style={[styles.px, styles.grid]}>
        <MetricCard label="Saved across active goals" value={formatMoney(data.activeTotal, currency)} caption="Current balance · excludes archived" wide />
        <MetricCard label={`Contributed in ${MONTHS[m - 1]}`} value={formatMoney(data.month.contributionTotal, currency)} caption={data.month.withdrawalTotal ? `Net ${formatMoney(data.month.net, currency, { sign: true })} after withdrawals` : `${data.month.activeDays} saving days`} />
        <MetricCard label="Avg per saving day" value={formatMoney(data.all.averagePerActiveDay, currency)} caption="All time" />
        <MetricCard label="Saving days" value={String(data.all.activeDays)} caption="All time" />
        <MetricCard
          label="Largest contribution"
          value={data.all.largestContribution ? formatMoney(data.all.largestContribution.amount, currency) : '—'}
          caption={data.all.largestContribution ? formatDateKey(data.all.largestContribution.date, 'full') : 'All time'}
        />
        {prefs.showStreak ? (
          <MetricCard label="Current streak" value={`${data.streak} ${data.streak === 1 ? 'day' : 'days'}`} caption={`Best: ${data.best} ${data.best === 1 ? 'day' : 'days'}`} />
        ) : null}
        <MetricCard
          label="Goals reached"
          value={data.completion ? `${data.completion.done} of ${data.completion.total}` : '—'}
          caption={data.completion ? `${Math.round(data.completion.ratio * 100)}% completion rate` : 'All goals'}
        />
        {data.lifetime !== data.activeTotal ? (
          <MetricCard label="Lifetime balance" value={formatMoney(data.lifetime, currency)} caption="Includes archived goals" />
        ) : null}
      </Animated.View>

      <View style={styles.px}>
        <Pressable onPress={() => setShowDefs(s => !s)} style={styles.defsToggle} accessibilityRole="button" accessibilityState={{ expanded: showDefs }}>
          <AppText variant="smallStrong" tone="primary">
            How these are calculated
          </AppText>
          {showDefs ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
        </Pressable>
        {showDefs ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn}>
            <Surface style={{ gap: 8 }}>
              {[
                ['Contributions', 'Sum of money you recorded as saved.'],
                ['Withdrawals', 'Shown separately, as a positive amount.'],
                ['Net', 'Contributions minus withdrawals.'],
                ['Current balance', 'Per goal: all contributions minus all withdrawals.'],
                ['Saving day', 'A calendar day (your local time) with at least one contribution.'],
                ['Average per saving day', 'Contribution total ÷ saving days — not ÷ all calendar days.'],
                ['Streak', 'Consecutive days with a contribution, up to today or yesterday. Days off are perfectly fine.'],
                ['Estimates', 'Based on recorded history. They are projections, not guarantees.'],
              ].map(([k, v]) => (
                <AppText key={k} variant="caption" tone="secondary">
                  <AppText variant="caption" style={{ fontWeight: '700' }}>
                    {k}:{' '}
                  </AppText>
                  {v}
                </AppText>
              ))}
            </Surface>
          </Animated.View>
        ) : null}
      </View>

      {seen ? (
        <>
          {/* trend */}
          <Animated.View entering={enter(1)} style={[styles.px, { marginTop: 24 }]}>
            <SectionTitle title="Trend" />
            <Surface>
              <Segmented
                dense
                value={range}
                onChange={r => update({ insightsRange: r })}
                options={[
                  { key: 'daily', label: 'Daily' },
                  { key: 'weekly', label: 'Weekly' },
                  { key: 'monthly', label: 'Monthly' },
                ]}
                style={{ marginBottom: 14 }}
              />
              <TrendChart key={range} buckets={buckets} currency={currency} animate={animate} rangeLabel={rangeLabel} />
            </Surface>
          </Animated.View>

          {/* allocation */}
          {data.alloc.rows.length ? (
            <Animated.View entering={enter(2)} style={[styles.px, { marginTop: 24 }]}>
              <SectionTitle title="Where it’s going" />
              <Surface>
                <View style={styles.allocTop}>
                  <DonutChart
                    rows={data.alloc.rows.map(r => ({ key: r.goal.id, value: r.contributed }))}
                    total={data.alloc.total}
                    colorsList={series}
                    animate={animate}
                    center={
                      <>
                        <AppText variant="caption" tone="muted">
                          Contributed
                        </AppText>
                        <AppText variant="smallStrong" numeric>
                          {formatMoney(data.alloc.total, currency, { compact: true })}
                        </AppText>
                      </>
                    }
                  />
                  <View style={{ flex: 1, gap: 10 }}>
                    {data.alloc.rows.slice(0, 6).map((r, i) => (
                      <Pressable
                        key={r.goal.id}
                        onPress={() => navigation.navigate('GoalDetail', { goalId: r.goal.id })}
                        style={styles.legendRow}
                        accessibilityRole="button"
                        accessibilityLabel={`${r.goal.name}: ${Math.round((r.contributed * 100) / data.alloc.total)} percent of contributions`}
                      >
                        <View style={[styles.swatch, { backgroundColor: series[i % series.length] }]} />
                        <AppText variant="small" numberOfLines={1} style={{ flex: 1 }}>
                          {r.goal.name}
                        </AppText>
                        <AppText variant="smallStrong" numeric>
                          {Math.round((r.contributed * 100) / data.alloc.total)}%
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
                {data.alloc.hasWithdrawals ? (
                  <View style={[styles.allocTable, { borderColor: colors.border }]}>
                    <View style={styles.tableRow}>
                      <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                        Goal
                      </AppText>
                      <AppText variant="caption" tone="muted" style={styles.col}>
                        Contributed
                      </AppText>
                      <AppText variant="caption" tone="muted" style={styles.col}>
                        Balance now
                      </AppText>
                    </View>
                    {data.alloc.rows.map(r => (
                      <View key={r.goal.id} style={styles.tableRow}>
                        <AppText variant="small" numberOfLines={1} style={{ flex: 1 }}>
                          {r.goal.name}
                        </AppText>
                        <AppText variant="small" numeric style={styles.col}>
                          {formatMoney(r.contributed, currency, { compact: true })}
                        </AppText>
                        <AppText variant="smallStrong" numeric style={styles.col}>
                          {formatMoney(r.balance, currency, { compact: true })}
                        </AppText>
                      </View>
                    ))}
                    <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                      Shares are based on contributions. Balance now subtracts withdrawals.
                    </AppText>
                  </View>
                ) : null}
              </Surface>
            </Animated.View>
          ) : null}

          {/* consistency */}
          <Animated.View entering={enter(3)} style={[styles.px, { marginTop: 24 }]}>
            <SectionTitle title="Consistency" />
            <Surface>
              <AppText variant="small" tone="secondary">
                {data.heat.activeDays} saving {data.heat.activeDays === 1 ? 'day' : 'days'} in the last 16 weeks
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2, marginBottom: 12 }}>
                Darker squares mean larger contributions. Empty days are simply days off.
              </AppText>
              <View style={{ alignItems: 'center' }}>
                <Heatmap columns={data.heat.columns} />
              </View>
              <HeatLegend />
            </Surface>
          </Animated.View>

          {/* goal progress */}
          {visibleGoals.length ? (
            <Animated.View entering={enter(4)} style={[styles.px, { marginTop: 24 }]}>
              <SectionTitle title="Goal progress" />
              <Surface style={{ gap: 16 }}>
                {visibleGoals.map((g, i) => {
                  const s = stats.get(g.id);
                  return (
                    <Pressable key={g.id} onPress={() => navigation.navigate('GoalDetail', { goalId: g.id })} accessibilityRole="button" accessibilityLabel={`${g.name}: ${formatMoney(s.balance, g.currencyCode)} of ${formatMoney(g.targetAmount, g.currencyCode)}`}>
                      <View style={styles.rowBetween}>
                        <AppText variant="smallStrong" numberOfLines={1} style={{ flex: 1 }}>
                          {g.name}
                        </AppText>
                        <AppText variant="caption" tone="muted" numeric>
                          {formatMoney(s.balance, g.currencyCode, { compact: true })} / {formatMoney(g.targetAmount, g.currencyCode, { compact: true })}
                        </AppText>
                      </View>
                      <ProgressBar progress={s.ratio} height={8} style={{ marginTop: 8 }} delay={animate ? i * 60 : 0} />
                    </Pressable>
                  );
                })}
              </Surface>
            </Animated.View>
          ) : null}

          {/* milestones */}
          {prefs.celebrations ? (
            <Animated.View entering={enter(5)} style={[styles.px, { marginTop: 24 }]}>
              <SectionTitle title="Milestones" />
              <Surface padded={false} style={{ paddingVertical: 6 }}>
                {achieved.slice(0, 8).map(ms => {
                  const Icon = MILESTONE_ICONS[ms.icon] || Star;
                  return (
                    <View key={ms.key} style={styles.milestone}>
                      <View style={[styles.msIcon, { backgroundColor: colors.primarySoft }]}>
                        <Icon size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong">{ms.title}</AppText>
                        <AppText variant="caption" tone="muted">
                          {ms.description} · {formatDateKey(todayKey(new Date(ms.achievedAt)), 'full')}
                        </AppText>
                      </View>
                    </View>
                  );
                })}
                {locked.map(ms => (
                  <View key={ms.key} style={[styles.milestone, { opacity: 0.55 }]}>
                    <View style={[styles.msIcon, { backgroundColor: colors.surfaceAlt }]}>
                      <Lock size={16} color={colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{ms.title}</AppText>
                      <AppText variant="caption" tone="muted">
                        {ms.description}
                      </AppText>
                    </View>
                  </View>
                ))}
              </Surface>
              <AppText variant="caption" tone="muted" center style={{ marginTop: 8 }}>
                Milestones are just for fun — they have no monetary value.
              </AppText>
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </SectionScreen>
  );
}

function MetricCard({ label, value, caption, wide }) {
  const { colors, radius } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}. ${caption || ''}`}
      style={[
        styles.metric,
        { backgroundColor: wide ? colors.primarySoft : colors.surface, borderRadius: radius.lg, borderColor: colors.border, width: wide ? '100%' : '48.3%' },
      ]}
    >
      <AppText variant="caption" tone={wide ? 'secondary' : 'muted'} numberOfLines={2}>
        {label}
      </AppText>
      <AppText variant={wide ? 'h1' : 'h3'} numeric numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4 }} color={wide && colors.scheme === 'light' ? colors.primaryPressed : undefined}>
        {value}
      </AppText>
      {caption ? (
        <AppText variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  px: { paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  metric: { padding: 14, borderWidth: StyleSheet.hairlineWidth },
  defsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 14, alignSelf: 'flex-start' },
  allocTop: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  allocTable: { marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  col: { width: 84, textAlign: 'right' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  msIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
