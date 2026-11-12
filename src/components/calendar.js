import React, { memo, useMemo, useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DOT_COLORS } from '../theme/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, Button, IconButton } from './ui';
import { BottomSheet } from './sheet';
import { MONTHS, WEEK_LABELS, monthMatrix, shiftMonth, splitKey, todayKey, formatDateKey, weekdayOf } from '../utils/dates';
import { formatMoney } from '../utils/money';

/** Activity level 0..4 from a positive net amount relative to the month's max. */
export function intensity(net, max) {
  if (!net || net <= 0 || !max) {
    return 0;
  }
  const r = net / max;
  return r > 0.75 ? 4 : r > 0.45 ? 3 : r > 0.2 ? 2 : 1;
}

const DayCell = memo(function DayCell({ dateKey, selected, isToday, isFuture, level, hasWithdrawal, disabled, onPress, colors, size, label }) {
  if (!dateKey) {
    return <View style={{ width: size, height: size }} />;
  }
  const day = Number(dateKey.slice(8));
  const heatBg = level > 0 ? colors.heat[level] : 'transparent';
  const strong = level >= 3;
  const textColor = selected
    ? colors.onPrimary
    : strong
    ? colors.scheme === 'dark'
      ? '#08261B'
      : '#FFFFFF'
    : isFuture
    ? colors.faint
    : colors.text;
  return (
    <Pressable
      onPress={() => onPress(dateKey)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={[styles.cellWrap, { width: size, height: size }]}
    >
      <View
        style={[
          styles.cell,
          {
            width: size - 6,
            height: size - 6,
            borderRadius: (size - 6) / 2.4,
            backgroundColor: selected ? colors.primary : heatBg,
            borderWidth: isToday && !selected ? 1.5 : 0,
            borderColor: colors.primary,
            opacity: disabled ? 0.35 : 1,
          },
        ]}
      >
        <AppText variant="smallStrong" numeric color={textColor} style={isToday && !selected ? { color: colors.primary } : null}>
          {day}
        </AppText>
        {hasWithdrawal ? <View style={[styles.wDot, { backgroundColor: selected ? colors.onPrimary : colors.withdraw }]} /> : null}
      </View>
    </Pressable>
  );
});

/**
 * Month grid. `daily` is a Map<dateKey, {net, contrib, withdraw, count}>.
 * Empty days stay neutral — never marked as failures.
 */
export function MonthGrid({ year, month0, selected, onSelect, daily, maxDate, minDate, width, currency }) {
  const { colors } = useTheme();
  const today = todayKey();
  const rows = useMemo(() => monthMatrix(year, month0), [year, month0]);
  const max = useMemo(() => {
    let m = 0;
    if (daily) {
      for (const row of rows) {
        for (const k of row) {
          const d = k && daily.get(k);
          if (d && d.net > m) {
            m = d.net;
          }
        }
      }
    }
    return m;
  }, [daily, rows]);
  const size = Math.floor(width / 7);
  return (
    <View>
      <View style={styles.weekRow}>
        {WEEK_LABELS.map((l, i) => (
          <View key={i} style={{ width: size, alignItems: 'center' }}>
            <AppText variant="caption" tone="muted">
              {l}
            </AppText>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((k, ci) => {
            const d = k && daily ? daily.get(k) : null;
            const disabled = !!k && ((maxDate && k > maxDate) || (minDate && k < minDate));
            const label = k
              ? `${formatDateKey(k, 'long')}${k === today ? ', today' : ''}${
                  d ? `, saved ${formatMoney(d.contrib, currency)}${d.withdraw ? `, withdrew ${formatMoney(d.withdraw, currency)}` : ''}` : ', no entries'
                }`
              : '';
            return (
              <DayCell
                key={k || `e${ci}`}
                dateKey={k}
                selected={k === selected}
                isToday={k === today}
                isFuture={!!daily && !!k && k > today}
                level={d ? intensity(d.net, max) : 0}
                hasWithdrawal={!!d?.withdraw}
                disabled={disabled}
                onPress={onSelect}
                colors={colors}
                size={size}
                label={label}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Minimal dot-grid month (inspired by the large-date sample):
 * ink = saved that day · orange = today · grey = past day without entries ·
 * light = upcoming · outline = outside this month. Empty days are neutral.
 */
export function DotMonthGrid({ year, month0, selected, onSelect, daily, width, currency }) {
  const { colors, isDark } = useTheme();
  const D = DOT_COLORS[isDark ? 'dark' : 'light'];
  const today = todayKey();
  const rows = useMemo(() => monthMatrix(year, month0), [year, month0]);
  const cell = Math.floor(width / 7);
  const dot = cell - 6;
  const todayCol = (weekdayOf(today) + 6) % 7;
  const isThisMonth = today.slice(0, 7) === `${year}-${String(month0 + 1).padStart(2, '0')}`;
  // Leading/trailing cells show the neighbouring month as outlines, like the sample.
  return (
    <View>
      <View style={styles.weekRow}>
        {WEEK_LABELS.map((l, i) => (
          <View key={i} style={{ width: cell, alignItems: 'center', paddingBottom: 6 }}>
            <AppText variant="caption" color={isThisMonth && i === todayCol ? D.today : colors.muted} style={{ fontWeight: '600' }}>
              {l}
            </AppText>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.weekRow, { marginBottom: 2 }]}>
          {row.map((k, ci) => {
            if (!k) {
              return (
                <View key={`e${ci}`} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: dot, height: dot, borderRadius: dot / 2, borderWidth: 1, borderColor: D.outline }} />
                </View>
              );
            }
            const d = daily?.get(k);
            const saved = d && d.contrib > 0;
            const isToday = k === today;
            const future = k > today;
            const bg = isToday ? D.today : saved ? D.saved : future ? D.future : D.past;
            const fg = isToday || saved ? (isToday ? '#FFFFFF' : D.savedText) : D.text;
            const isSel = k === selected;
            return (
              <Pressable
                key={k}
                onPress={() => onSelect(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`${formatDateKey(k, 'long')}${isToday ? ', today' : ''}${
                  d ? `, saved ${formatMoney(d.contrib, currency)}${d.withdraw ? `, withdrew ${formatMoney(d.withdraw, currency)}` : ''}` : ', no entries'
                }`}
                style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: dot,
                    height: dot,
                    borderRadius: dot / 2,
                    backgroundColor: bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: fg, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'], opacity: isToday || saved ? 0.95 : 0.7 }} maxFontSizeMultiplier={1.2}>
                    {Number(k.slice(8))}
                  </Text>
                  {d?.withdraw ? <View style={[styles.wDot, { backgroundColor: isToday ? '#FFFFFF' : colors.withdraw, bottom: 6 }]} /> : null}
                </View>
                {isSel && !isToday ? (
                  <View pointerEvents="none" style={{ position: 'absolute', width: dot + 6, height: dot + 6, borderRadius: (dot + 6) / 2, borderWidth: 2, borderColor: D.today }} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function MonthHeader({ year, month0, onPrev, onNext, right, dark }) {
  const { colors } = useTheme();
  const fg = dark ? '#F3F7F3' : colors.text;
  const bg = dark ? 'rgba(255,255,255,0.08)' : colors.surfaceAlt;
  return (
    <View style={styles.monthHeader}>
      <IconButton icon={ChevronLeft} label="Previous month" onPress={onPrev} size={38} background={bg} color={fg} />
      <AppText variant="h3" color={fg} style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header" accessibilityLiveRegion="polite">
        {MONTHS[month0]} {year}
      </AppText>
      {right}
      <IconButton icon={ChevronRight} label="Next month" onPress={onNext} size={38} background={bg} color={fg} />
    </View>
  );
}

/** Date picker sheet built on the same month grid. */
export function DatePickerSheet({ visible, onClose, value, onChange, maxDate, minDate, title = 'Choose a date', allowClear, onClear }) {
  const initial = value || todayKey();
  const { y, m } = splitKey(initial);
  const [cursor, setCursor] = useState({ year: y, month0: m - 1 });
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (visible) {
      const s = splitKey(value || todayKey());
      setCursor({ year: s.y, month0: s.m - 1 });
    }
  }, [visible, value]);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <MonthHeader
        year={cursor.year}
        month0={cursor.month0}
        onPrev={() => setCursor(c => shiftMonth(c.year, c.month0, -1))}
        onNext={() => setCursor(c => shiftMonth(c.year, c.month0, 1))}
      />
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ marginTop: 8 }}>
        {width > 0 ? (
          <MonthGrid
            year={cursor.year}
            month0={cursor.month0}
            selected={value}
            onSelect={k => onChange(k)}
            maxDate={maxDate}
            minDate={minDate}
            width={width}
          />
        ) : null}
      </View>
      <View style={styles.pickerActions}>
        <Button
          title="Today"
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          onPress={() => onChange(todayKey())}
          disabled={(maxDate && todayKey() > maxDate) || (minDate && todayKey() < minDate)}
        />
        {allowClear ? <Button title="No date" variant="outline" size="md" style={{ flex: 1 }} onPress={onClear} /> : null}
      </View>
      <AppText variant="caption" center tone="muted" style={{ marginTop: 10 }}>
        {value ? formatDateKey(value, 'long') : 'No date selected'}
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  cellWrap: { alignItems: 'center', justifyContent: 'center' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  wDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
