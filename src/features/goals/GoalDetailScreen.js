import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pencil,
  Ellipsis,
  ChevronsUp,
  ArrowDownLeft,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  CalendarDays,
  Sparkles,
  Minus,
  Plus,
  Info,
} from 'lucide-react-native';
import { useData } from '../../store/data';
import { useTheme } from '../../theme/ThemeProvider';
import { categoryMeta } from '../../theme/tokens';
import { StackHeader } from '../../components/screen';
import { AppText, Button, IconButton, ListRow, Pill, SectionTitle, Segmented, Surface } from '../../components/ui';
import { GoalVisual, StatusPill, TransactionRow, categoryIconComponent } from '../../components/goal';
import { ProgressRing } from '../../components/progress';
import { BottomSheet } from '../../components/sheet';
import { KeypadSheet } from '../../components/keypad';
import { DatePickerSheet } from '../../components/calendar';
import { useToast } from '../../components/feedback';
import { estimateCompletion, requiredPace, simulate } from '../../services/predictions';
import { STATUS, TX, sortTransactionsDesc } from '../../services/calculations';
import { dialSteps, formatMoney, minorFactor } from '../../utils/money';
import { addDays, formatDateKey, todayKey } from '../../utils/dates';

export function GoalDetailScreen({ navigation, route }) {
  const { goalId } = route.params;
  const { goals, stats, transactions, archiveGoal, restoreGoal, deleteGoal } = useData();
  const { colors, radius, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const leaving = useRef(false);

  const goal = goals.find(g => g.id === goalId);
  const stat = goal ? stats.get(goal.id) : null;

  useEffect(() => {
    if (!goal && !leaving.current && navigation.isFocused()) {
      leaving.current = true;
      navigation.goBack();
    }
  }, [goal, navigation]);

  const goalTxs = useMemo(() => sortTransactionsDesc(transactions.filter(t => t.goalId === goalId)), [transactions, goalId]);
  const today = todayKey();
  const estimate = useMemo(
    () => (goal ? estimateCompletion({ goal, balance: stat.balance, transactions, today }) : null),
    [goal, stat, transactions, today],
  );
  const pace = goal
    ? requiredPace({ remaining: stat.remaining, today, targetDate: goal.targetDate, unit: minorFactor(goal.currencyCode) })
    : null;

  if (!goal || !stat) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const c = goal.currencyCode;
  const archived = goal.status === STATUS.ARCHIVED;
  const enter = i => (reduceMotion ? undefined : FadeInDown.delay(50 * i).duration(260));

  const confirmDelete = () => {
    setMenu(false);
    Alert.alert(
      `Delete “${goal.name}”?`,
      `This permanently removes the goal and its ${goalTxs.length} ${goalTxs.length === 1 ? 'entry' : 'entries'} from this device. If you just want it out of the way, archive it instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            leaving.current = true;
            await deleteGoal(goal.id);
            navigation.goBack();
            toast.show({ message: 'Goal deleted' });
          },
        },
      ],
    );
  };

  const toggleArchive = async () => {
    setMenu(false);
    if (archived) {
      await restoreGoal(goal.id);
      toast.show({ message: `${goal.name} restored` });
    } else {
      await archiveGoal(goal.id);
      toast.show({ message: `${goal.name} archived`, action: { label: 'Undo', onPress: () => restoreGoal(goal.id) } });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title=""
        right={
          <>
            <IconButton icon={Pencil} label="Edit goal" onPress={() => navigation.navigate('GoalEditor', { goalId })} />
            <IconButton icon={Ellipsis} label="More actions" onPress={() => setMenu(true)} />
          </>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(300)} style={styles.px}>
          <GoalVisual goal={goal} size={width - 40} radius={radius.xl} style={{ height: Math.min(260, (width - 40) * 0.68) }} iconScale={0.2} />
        </Animated.View>

        <Animated.View entering={enter(1)} style={[styles.px, { marginTop: 18 }]}>
          <View style={styles.tags}>
            {goal.category ? (
              <Pill
                label={goal.category}
                icon={categoryIconComponent(goal.category)}
                color={colors.scheme === 'dark' ? colors.text : categoryMeta(goal.category).hue}
                background={colors.surfaceAlt}
              />
            ) : null}
            {goal.priority ? <Pill label={`${goal.priority} priority`} color={colors.muted} background={colors.surfaceAlt} /> : null}
            <StatusPill status={goal.status} />
          </View>
          <AppText variant="h1" style={{ marginTop: 8 }} accessibilityRole="header">
            {goal.name}
          </AppText>
        </Animated.View>

        {/* progress */}
        <Animated.View entering={enter(2)} style={[styles.px, { marginTop: 18 }]}>
          <Surface style={styles.progressCard}>
            <ProgressRing size={124} stroke={11} progress={stat.ratio} accessibilityLabel={`${stat.percent} percent of target`}>
              <AppText variant="h2" numeric>
                {stat.percent}%
              </AppText>
              <AppText variant="caption" tone="muted">
                of target
              </AppText>
            </ProgressRing>
            <View style={{ flex: 1, gap: 10 }}>
              <Metric label="Saved" value={formatMoney(stat.balance, c)} strong />
              <Metric label="Target" value={formatMoney(goal.targetAmount, c)} />
              <Metric
                label={stat.overTarget > 0 ? 'Over target' : 'Remaining'}
                value={formatMoney(stat.overTarget > 0 ? stat.overTarget : stat.remaining, c)}
                tone={stat.overTarget > 0 ? 'primary' : undefined}
              />
            </View>
          </Surface>
        </Animated.View>

        {/* actions */}
        <Animated.View entering={enter(3)} style={[styles.px, styles.actions]}>
          <Button
            title="Add savings"
            icon={ChevronsUp}
            style={{ flex: 1.4 }}
            onPress={() => navigation.navigate('SavingsDial', { goalId, source: 'goal' })}
          />
          <Button
            title="Withdraw"
            variant="withdraw"
            icon={ArrowDownLeft}
            style={{ flex: 1 }}
            disabled={stat.balance <= 0}
            onPress={() => navigation.navigate('SavingsDial', { goalId, type: TX.WITHDRAWAL, source: 'goal' })}
          />
        </Animated.View>
        {archived ? (
          <AppText variant="caption" tone="muted" center style={{ marginTop: 10, paddingHorizontal: 24 }}>
            This goal is archived. You can still record entries; restore it to show it on Home.
          </AppText>
        ) : null}

        {/* timing */}
        <Animated.View entering={enter(4)} style={[styles.px, { marginTop: 28 }]}>
          <SectionTitle title="Timing" />
          <Surface padded={false}>
            {goal.targetDate ? (
              <View style={styles.timingRow}>
                <CalendarDays size={18} color={colors.muted} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">Target date · {formatDateKey(goal.targetDate, 'full')}</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }} numeric>
                    {pace?.status === 'ok'
                      ? `${pace.days} days left · about ${formatMoney(pace.perDay, c)}/day or ${formatMoney(pace.perWeek, c)}/week needed`
                      : pace?.status === 'reached'
                      ? 'Target already reached'
                      : 'Target date has passed — you can set a new one in Edit'}
                  </AppText>
                </View>
              </View>
            ) : null}
            <View style={[styles.timingRow, goal.targetDate && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
              <Sparkles size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="bodyStrong">
                    {estimate.status === 'estimate'
                      ? `Est. completion · ${formatDateKey(estimate.date, 'full')}`
                      : estimate.status === 'reached'
                      ? 'Target reached'
                      : 'Estimated completion'}
                  </AppText>
                  {estimate.status === 'estimate' ? <Pill label="Estimate" color={colors.muted} background={colors.surfaceAlt} /> : null}
                </View>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }} numeric>
                  {estimate.status === 'estimate'
                    ? `At your pace over the last ${estimate.window} days (${formatMoney(estimate.netInWindow, c)} net, counting every calendar day), in about ${estimate.days} days. Not a guarantee.`
                    : estimate.status === 'reached'
                    ? `You’ve saved ${formatMoney(stat.balance, c)}.`
                    : `${estimate.reason}. Save on a couple of different days and an estimate will appear.`}
                </AppText>
              </View>
            </View>
          </Surface>
        </Animated.View>

        {/* simulator */}
        {stat.remaining > 0 ? (
          <Animated.View entering={enter(5)} style={[styles.px, { marginTop: 28 }]}>
            <Simulator goal={goal} remaining={stat.remaining} estimate={estimate} />
          </Animated.View>
        ) : null}

        {/* history */}
        <Animated.View entering={enter(6)} style={[styles.px, { marginTop: 28 }]}>
          <SectionTitle
            title="History"
            action={goalTxs.length > 6 ? `See all ${goalTxs.length}` : undefined}
            onAction={() => navigation.navigate('History', { goalId })}
          />
          <Surface padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {goalTxs.length ? (
              goalTxs.slice(0, 6).map(t => (
                <TransactionRow key={t.id} tx={t} showGoal={false} onPress={() => navigation.navigate('Transaction', { txId: t.id })} />
              ))
            ) : (
              <AppText variant="small" tone="muted" style={{ paddingVertical: 18, textAlign: 'center' }}>
                Nothing recorded yet. Your first contribution starts the progress ring.
              </AppText>
            )}
          </Surface>
        </Animated.View>

        {goal.productUrl || goal.notes ? (
          <Animated.View entering={enter(7)} style={[styles.px, { marginTop: 28 }]}>
            <SectionTitle title="Details" />
            <Surface padded={false}>
              {goal.productUrl ? (
                <ListRow
                  icon={ExternalLink}
                  title="Product page"
                  subtitle={goal.productUrl}
                  onPress={() => Linking.openURL(goal.productUrl).catch(() => toast.show({ message: 'Couldn’t open the link', tone: 'error' }))}
                />
              ) : null}
              {goal.notes ? (
                <View style={{ padding: 16 }}>
                  <AppText variant="caption" tone="muted">
                    Notes
                  </AppText>
                  <AppText style={{ marginTop: 4 }}>{goal.notes}</AppText>
                </View>
              ) : null}
            </Surface>
          </Animated.View>
        ) : null}

        <AppText variant="caption" tone="muted" center style={{ marginTop: 24 }}>
          Created {formatDateKey(todayKey(new Date(goal.createdAt)), 'full')}
          {goal.completedAt ? ` · Reached ${formatDateKey(todayKey(new Date(goal.completedAt)), 'full')}` : ''}
        </AppText>
      </ScrollView>

      <BottomSheet visible={menu} onClose={() => setMenu(false)} title={goal.name}>
        <View style={{ marginHorizontal: -20 }}>
          <ListRow icon={Pencil} title="Edit goal" onPress={() => { setMenu(false); navigation.navigate('GoalEditor', { goalId }); }} />
          <ListRow
            icon={archived ? ArchiveRestore : Archive}
            title={archived ? 'Restore goal' : 'Archive goal'}
            subtitle={archived ? 'Show it on Home again' : 'Hide from Home; history is kept'}
            onPress={toggleArchive}
          />
          <ListRow icon={Trash2} title="Delete goal" subtitle="Permanently remove it and its entries" danger onPress={confirmDelete} />
        </View>
      </BottomSheet>
    </View>
  );
}

function Metric({ label, value, strong, tone }) {
  return (
    <View>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant={strong ? 'h3' : 'bodyStrong'} tone={tone} numeric numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

/** What-if savings simulator. Assumptions are always shown with the result. */
function Simulator({ goal, remaining, estimate }) {
  const { colors } = useTheme();
  const c = goal.currencyCode;
  const steps = dialSteps(c);
  const today = todayKey();
  const [mode, setMode] = useState('day');
  const [amount, setAmount] = useState(steps[1]);
  const [byDate, setByDate] = useState(goal.targetDate && goal.targetDate > today ? goal.targetDate : addDays(today, 90));
  const [sheet, setSheet] = useState(null);

  const currentRate = estimate?.status === 'estimate' ? estimate.dailyRate : 0;
  const result = useMemo(() => {
    if (mode === 'date') {
      return requiredPace({ remaining, today, targetDate: byDate, unit: minorFactor(c) });
    }
    if (mode === 'boost') {
      const perDay = Math.ceil(currentRate + amount);
      return { ...simulate({ remaining, amount: perDay, period: 'day', today }), perDay };
    }
    return simulate({ remaining, amount, period: mode, today });
  }, [mode, amount, remaining, today, byDate, currentRate, c]);

  const stepBy = dir => setAmount(a => Math.max(steps[0], a + dir * steps[1]));

  return (
    <>
      <SectionTitle title="What if…" />
      <Surface>
        <Segmented
          dense
          value={mode}
          onChange={setMode}
          options={[
            { key: 'day', label: 'Daily' },
            { key: 'week', label: 'Weekly' },
            { key: 'boost', label: 'Boost', a11y: 'Increase my current average' },
            { key: 'date', label: 'By date' },
          ]}
        />
        <AppText variant="small" tone="secondary" style={{ marginTop: 16 }}>
          {mode === 'day'
            ? 'If I save this much every day'
            : mode === 'week'
            ? 'If I save this much every week'
            : mode === 'boost'
            ? `If I add this per day to my current pace (${formatMoney(Math.round(currentRate), c)}/day)`
            : 'To reach my goal by'}
        </AppText>

        {mode === 'date' ? (
          <Pressable
            onPress={() => setSheet('date')}
            accessibilityRole="button"
            accessibilityLabel={`Target date ${formatDateKey(byDate, 'long')}. Change`}
            style={[styles.simValue, { backgroundColor: colors.surfaceAlt }]}
          >
            <CalendarDays size={18} color={colors.primary} />
            <AppText variant="h3">{formatDateKey(byDate, 'full')}</AppText>
          </Pressable>
        ) : (
          <View style={styles.stepper}>
            <IconButton icon={Minus} label={`Decrease by ${formatMoney(steps[1], c)}`} onPress={() => stepBy(-1)} disabled={amount <= steps[0]} />
            <Pressable onPress={() => setSheet('keypad')} accessibilityRole="button" accessibilityLabel={`${formatMoney(amount, c)}. Tap to type an amount`} style={[styles.simValue, { flex: 1, backgroundColor: colors.surfaceAlt }]}>
              <AppText variant="h2" numeric>
                {formatMoney(amount, c)}
              </AppText>
            </Pressable>
            <IconButton icon={Plus} label={`Increase by ${formatMoney(steps[1], c)}`} onPress={() => stepBy(1)} />
          </View>
        )}

        <View style={[styles.simResult, { backgroundColor: colors.primarySoft }]} accessibilityLiveRegion="polite">
          {mode === 'date' ? (
            result?.status === 'ok' ? (
              <>
                <AppText variant="h3" numeric color={colors.scheme === 'dark' ? colors.primary : colors.primaryPressed}>
                  {formatMoney(result.perDay, c)}/day · {formatMoney(result.perWeek, c)}/week
                </AppText>
                <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                  To cover the remaining {formatMoney(remaining, c)} in {result.days} days.
                </AppText>
              </>
            ) : (
              <AppText variant="small" tone="secondary">
                Pick a date in the future.
              </AppText>
            )
          ) : result?.status === 'ok' ? (
            <>
              <AppText variant="h3" color={colors.scheme === 'dark' ? colors.primary : colors.primaryPressed}>
                Reached around {formatDateKey(result.date, 'full')}
              </AppText>
              <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }} numeric>
                {result.periods} {mode === 'week' ? (result.periods === 1 ? 'week' : 'weeks') : result.periods === 1 ? 'day' : 'days'} of saving to cover{' '}
                {formatMoney(remaining, c)}
                {mode === 'boost' ? ` at ${formatMoney(result.perDay, c)}/day` : ''}. Assumes no withdrawals.
              </AppText>
            </>
          ) : (
            <AppText variant="small" tone="secondary">
              Enter an amount above zero.
            </AppText>
          )}
        </View>
        <View style={styles.assumption}>
          <Info size={13} color={colors.muted} />
          <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
            Simulations are estimates, not guarantees.
          </AppText>
        </View>
      </Surface>

      <KeypadSheet
        visible={sheet === 'keypad'}
        dark={false}
        currency={c}
        initialMinor={amount}
        onClose={() => setSheet(null)}
        onSubmit={v => {
          setAmount(v);
          setSheet(null);
        }}
      />
      <DatePickerSheet
        visible={sheet === 'date'}
        value={byDate}
        minDate={addDays(today, 1)}
        onClose={() => setSheet(null)}
        onChange={k => {
          setByDate(k);
          setSheet(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  px: { paddingHorizontal: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  timingRow: { flexDirection: 'row', gap: 12, padding: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  simValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, marginTop: 10 },
  simResult: { marginTop: 14, padding: 14, borderRadius: 16 },
  assumption: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
});
