import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  Smartphone,
  Plane,
  Bike,
  Sofa,
  Shirt,
  GraduationCap,
  Gift,
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheck,
  Archive,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { cardGradient, categoryMeta } from '../theme/tokens';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText, Pill, PressableScale } from './ui';
import { ProgressBar, ProgressRing } from './progress';
import { formatMoney } from '../utils/money';
import { formatDateKey } from '../utils/dates';
import { STATUS, TX } from '../services/calculations';

const ICONS = { Smartphone, Plane, Bike, Sofa, Shirt, GraduationCap, Gift };

export function CategoryIcon({ category, size = 20, color }) {
  const meta = categoryMeta(category);
  const Icon = ICONS[meta.icon] || Gift;
  return <Icon size={size} color={color || meta.hue} strokeWidth={1.8} />;
}

/** Stable icon components per category, usable wherever an `icon` component prop is expected. */
const iconCache = {};
export function categoryIconComponent(category) {
  const key = category || 'Other';
  if (!iconCache[key]) {
    const Comp = ({ size, color }) => <CategoryIcon category={key} size={size} color={color} />;
    Comp.displayName = `CategoryIcon(${key})`;
    iconCache[key] = Comp;
  }
  return iconCache[key];
}

/** Product image with consistent crop, or a category illustration fallback. */
export function GoalVisual({ goal, size = 64, radius: r, style, iconScale = 0.42 }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const br = r ?? Math.round(size * 0.28);
  if (goal?.imageUri && !failed) {
    return (
      <Image
        source={{ uri: goal.imageUri }}
        onError={() => setFailed(true)}
        style={[{ width: size, height: size, borderRadius: br, backgroundColor: colors.surfaceAlt }, style]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={`${goal.name} image`}
      />
    );
  }
  // Fallback: the same soft category gradient used by the Goals cards.
  const [g1, g2] = cardGradient(goal?.category);
  const gradId = `gv${(goal?.category || 'Other').replace(/\W/g, '')}`;
  return (
    <View
      style={[styles.fallback, { width: size, height: size, borderRadius: br, backgroundColor: g2 }, style]}
      accessible
      accessibilityLabel={`${goal?.category || 'Goal'} illustration`}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0.2" y2="1">
            <Stop offset="0" stopColor={g1} />
            <Stop offset="1" stopColor={g2} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradId})`} />
      </Svg>
      <View style={{ opacity: size > 90 ? 0.28 : 0.75 }}>
        <CategoryIcon category={goal?.category} size={Math.round(size * iconScale)} color="#17221D" />
      </View>
    </View>
  );
}

export function StatusPill({ status }) {
  const { colors } = useTheme();
  if (status === STATUS.COMPLETED) {
    return <Pill label="Reached" icon={CircleCheck} color={colors.primary} background={colors.primarySoft} />;
  }
  if (status === STATUS.ARCHIVED) {
    return <Pill label="Archived" icon={Archive} color={colors.muted} background={colors.surfaceAlt} />;
  }
  return null;
}

/** Product-object card for carousels. */
export function GoalCard({ goal, stat, width = 220, onPress }) {
  const { colors, radius } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`${goal.name}. ${formatMoney(stat.balance, goal.currencyCode)} of ${formatMoney(goal.targetAmount, goal.currencyCode)}, ${stat.percent} percent`}
      style={[styles.card, { width, borderRadius: radius.xl, backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <GoalVisual goal={goal} size={width - 24} radius={radius.lg} style={{ height: (width - 24) * 0.78 }} iconScale={0.3} />
      <View style={{ paddingHorizontal: 4, paddingTop: 12 }}>
        <View style={styles.rowBetween}>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {goal.name}
          </AppText>
          <StatusPill status={goal.status} />
        </View>
        <AppText variant="small" tone="muted" numeric style={{ marginTop: 2 }}>
          {formatMoney(stat.balance, goal.currencyCode)} / {formatMoney(goal.targetAmount, goal.currencyCode)}
        </AppText>
        <View style={[styles.rowBetween, { marginTop: 10, gap: 10 }]}>
          <ProgressBar progress={stat.ratio} height={6} style={{ flex: 1 }} />
          <AppText variant="caption" tone="secondary" numeric>
            {stat.percent}%
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

/** Compact list item for the Goals collection. */
export function GoalListItem({ goal, stat, onPress }) {
  const { colors, radius } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityLabel={`${goal.name}. ${formatMoney(stat.balance, goal.currencyCode)} saved of ${formatMoney(goal.targetAmount, goal.currencyCode)}`}
      style={[styles.listItem, { backgroundColor: colors.surface, borderRadius: radius.xl, borderColor: colors.border }]}
    >
      <GoalVisual goal={goal} size={76} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={[styles.rowBetween, { gap: 8 }]}>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {goal.name}
          </AppText>
          <StatusPill status={goal.status} />
        </View>
        <AppText variant="small" tone="muted" numeric>
          {formatMoney(stat.balance, goal.currencyCode)} of {formatMoney(goal.targetAmount, goal.currencyCode)}
        </AppText>
        <AppText variant="caption" tone="muted">
          {stat.remaining > 0 ? `${formatMoney(stat.remaining, goal.currencyCode)} to go` : 'Target reached'}
          {goal.targetDate ? ` · by ${formatDateKey(goal.targetDate, 'short')}` : ''}
        </AppText>
      </View>
      <ProgressRing size={52} stroke={5} progress={stat.ratio}>
        <AppText variant="caption" numeric style={{ fontWeight: '700' }}>
          {stat.percent}%
        </AppText>
      </ProgressRing>
    </PressableScale>
  );
}

export function TransactionRow({ tx, goal, onPress, showDate = true, showGoal = true }) {
  const { colors } = useTheme();
  const isW = tx.type === TX.WITHDRAWAL;
  const Icon = isW ? ArrowDownLeft : ArrowUpRight;
  const sub = [showGoal && goal ? goal.name : null, showDate ? formatDateKey(tx.date, 'relative') : null, tx.note]
    .filter(Boolean)
    .join(' · ');
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityLabel={`${isW ? 'Withdrawal' : 'Contribution'} of ${formatMoney(tx.amount, tx.currencyCode)}${goal ? ' for ' + goal.name : ''}, ${formatDateKey(tx.date, 'long')}`}
      style={styles.txRow}
    >
      <View style={[styles.txIcon, { backgroundColor: isW ? colors.withdrawSoft : colors.primarySoft }]}>
        <Icon size={18} color={isW ? colors.withdraw : colors.primary} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {isW ? 'Withdrawal' : 'Saved'}
        </AppText>
        {sub ? (
          <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {sub}
          </AppText>
        ) : null}
      </View>
      <AppText variant="bodyStrong" numeric color={isW ? colors.withdraw : colors.text}>
        {isW ? '−' : '+'}
        {formatMoney(tx.amount, tx.currencyCode)}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fallbackGlow: { position: 'absolute' },
  card: { padding: 12, paddingBottom: 16, borderWidth: StyleSheet.hairlineWidth },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, paddingRight: 16, borderWidth: StyleSheet.hairlineWidth },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  txIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
