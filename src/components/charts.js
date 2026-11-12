import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './ui';
import { formatMoney } from '../utils/money';
import { formatDateKey } from '../utils/dates';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const SERIES_LIGHT = ['#167A58', '#3B7EA8', '#B07A2A', '#A3567A', '#2E8C8C', '#5B62A8', '#9A6B4F', '#6E8B3D'];
export const SERIES_DARK = ['#68D9A5', '#7FB8E0', '#E5B060', '#E08BB4', '#5FCFCF', '#9AA1EA', '#D2A07F', '#A9C66B'];

export function useSeriesColors() {
  const { isDark } = useTheme();
  return isDark ? SERIES_DARK : SERIES_LIGHT;
}

/* ================= Trend bars ================= */

function Bar({ height, offsetTop, color, index, animate, selected, dimmed }) {
  const h = useSharedValue(animate ? 0 : height);
  useEffect(() => {
    h.value = animate ? withDelay(index * 28, withTiming(height, { duration: 520, easing: Easing.out(Easing.cubic) })) : height;
  }, [height, animate, index, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={{ position: 'absolute', top: offsetTop, left: 0, right: 0, alignItems: 'center' }}>
      <Animated.View style={[{ width: '62%', borderRadius: 6, backgroundColor: color, opacity: dimmed ? 0.35 : 1 }, selected && styles.barSelected, style]} />
    </View>
  );
}

/**
 * Net savings per bucket. Positive bars rise from the zero line, withdrawals-heavy
 * buckets fall below it. Tap a bar for exact values.
 */
export function TrendChart({ buckets, currency, animate = true, height = 170, rangeLabel }) {
  const { colors } = useTheme();
  const [sel, setSel] = useState(null);
  useEffect(() => setSel(null), [buckets]);

  const posMax = Math.max(0, ...buckets.map(b => b.net));
  const negMax = Math.max(0, ...buckets.map(b => -b.net));
  const span = posMax + negMax || 1;
  const zeroY = (posMax / span) * height;
  const empty = buckets.every(b => b.contrib === 0 && b.withdraw === 0);
  const current = sel != null ? buckets[sel] : null;

  return (
    <View>
      <View style={[styles.tooltip, { backgroundColor: colors.surfaceAlt }]} accessibilityLiveRegion="polite">
        {current ? (
          <>
            <AppText variant="smallStrong">{current.from === current.to ? formatDateKey(current.from, 'long') : current.label}</AppText>
            <AppText variant="caption" tone="secondary" numeric style={{ marginTop: 2 }}>
              Saved {formatMoney(current.contrib, currency)}
              {current.withdraw ? ` · Withdrawn ${formatMoney(current.withdraw, currency)}` : ''} · Net{' '}
              {formatMoney(current.net, currency, { sign: true })}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="smallStrong">{rangeLabel}</AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {empty ? 'No entries in this period yet.' : 'Tap a bar for exact amounts.'}
            </AppText>
          </>
        )}
      </View>
      <View style={{ height, marginTop: 12, flexDirection: 'row' }}>
        <View style={[styles.zeroLine, { top: zeroY, backgroundColor: colors.chartGrid }]} />
        {posMax > 0 ? <View style={[styles.gridLine, { top: 0, backgroundColor: colors.chartGrid }]} /> : null}
        {buckets.map((b, i) => {
          const isNeg = b.net < 0;
          const h = Math.max(b.net === 0 ? 0 : 3, (Math.abs(b.net) / span) * height);
          return (
            <Pressable
              key={b.key}
              style={{ flex: 1, height }}
              onPress={() => setSel(sel === i ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={`${b.label}: net ${formatMoney(b.net, currency)}`}
              accessibilityState={{ selected: sel === i }}
            >
              <Bar
                height={h}
                offsetTop={isNeg ? zeroY : zeroY - h}
                color={isNeg ? colors.withdraw : colors.primary}
                index={i}
                animate={animate}
                selected={sel === i}
                dimmed={sel != null && sel !== i}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axisRow}>
        {buckets.map((b, i) => (
          <View key={b.key} style={{ flex: 1, alignItems: 'center' }}>
            {buckets.length <= 14 && (buckets.length <= 12 || i % 2 === 0 || i === buckets.length - 1) ? (
              <AppText variant="caption" tone={sel === i ? 'primary' : 'muted'} style={{ fontSize: 10 }} numberOfLines={1}>
                {b.axis}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.axisMeta}>
        <AppText variant="caption" tone="muted" numeric>
          Max {formatMoney(posMax, currency, { compact: true })}
        </AppText>
        {negMax ? (
          <AppText variant="caption" tone="withdraw" numeric>
            Min −{formatMoney(negMax, currency, { compact: true })}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/* ================= Donut ================= */

function Segment({ r, c, stroke, color, start, fraction, animate, index }) {
  const v = useSharedValue(animate ? 0 : fraction);
  useEffect(() => {
    v.value = animate ? withDelay(120 + index * 80, withTiming(fraction, { duration: 700, easing: Easing.out(Easing.cubic) })) : fraction;
  }, [fraction, animate, index, v]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c - Math.max(0, v.value * c - 2) }));
  return (
    <AnimatedCircle
      r={r}
      cx={0}
      cy={0}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeDasharray={`${c} ${c}`}
      animatedProps={props}
      rotation={start * 360 - 90}
    />
  );
}

export function DonutChart({ rows, total, size = 148, stroke = 20, animate = true, colorsList, center }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G x={size / 2} y={size / 2}>
          <Circle r={r} fill="none" stroke={colors.surfaceAlt} strokeWidth={stroke} />
          {rows.map((row, i) => {
            const f = total ? row.value / total : 0;
            const start = acc;
            acc += f;
            return <Segment key={row.key} r={r} c={c} stroke={stroke} color={colorsList[i % colorsList.length]} start={start} fraction={f} animate={animate} index={i} />;
          })}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{center}</View>
    </View>
  );
}

/* ================= Consistency heatmap ================= */

export function Heatmap({ columns, cell = 14, gap = 3 }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {columns.map((col, ci) => (
        <View key={ci} style={{ gap }}>
          {col.map(d => (
            <View
              key={d.date}
              accessible={!d.future}
              accessibilityLabel={d.future ? undefined : `${formatDateKey(d.date, 'long')}: ${d.contrib ? 'saved' : 'no entries'}`}
              style={{
                width: cell,
                height: cell,
                borderRadius: 4,
                backgroundColor: d.future ? 'transparent' : colors.heat[d.level],
                borderWidth: d.future ? 1 : 0,
                borderColor: colors.border,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function HeatLegend() {
  const { colors } = useTheme();
  return (
    <View style={styles.legend}>
      <AppText variant="caption" tone="muted">
        Less
      </AppText>
      {colors.heat.map((c, i) => (
        <View key={i} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c }} />
      ))}
      <AppText variant="caption" tone="muted">
        More
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: { padding: 12, borderRadius: 14, minHeight: 58, justifyContent: 'center' },
  zeroLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  axisRow: { flexDirection: 'row', marginTop: 6 },
  axisMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  barSelected: { borderWidth: 0 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-end' },
});
