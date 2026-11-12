import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { BottomSheet } from './sheet';
import { AppText, Button, Segmented } from './ui';
import { GlassButton } from './glass';
import { useTheme } from '../theme/ThemeProvider';
import { useHaptics } from '../services/haptics';

const PRESETS = [
  { label: 'Morning', h: 8, m: 0 },
  { label: 'Lunch', h: 13, m: 0 },
  { label: 'Evening', h: 20, m: 0 },
  { label: 'Night', h: 22, m: 0 },
];

/** Hour/minute stepper picker. Value is 24h { hour, minute }. */
export function TimeStepper({ hour, minute, onChange, dark }) {
  const { colors } = useTheme();
  const { fire } = useHaptics();
  const pm = hour >= 12;
  const h12 = hour % 12 || 12;
  const fg = dark ? '#F3F7F3' : colors.text;
  const tone = dark ? 'dark' : undefined;
  const set = (h, m) => {
    fire('tick');
    onChange({ hour: ((h % 24) + 24) % 24, minute: ((m % 60) + 60) % 60 });
  };
  return (
    <View>
      <View style={styles.row}>
        <Column
          value={String(h12)}
          onUp={() => set(hour + 1, minute)}
          onDown={() => set(hour - 1, minute)}
          label="hour"
          fg={fg}
          tone={tone}
        />
        <Text style={[styles.colon, { color: fg }]}>:</Text>
        <Column
          value={String(minute).padStart(2, '0')}
          onUp={() => set(minute + 5 >= 60 ? hour + 1 : hour, minute + 5)}
          onDown={() => set(minute - 5 < 0 ? hour - 1 : hour, minute - 5)}
          label="minutes"
          fg={fg}
          tone={tone}
        />
      </View>
      {dark ? (
        <View style={styles.darkToggle} accessibilityRole="tablist">
          {['am', 'pm'].map(k => {
            const on = (k === 'pm') === pm;
            return (
              <Pressable
                key={k}
                onPress={() => set(k === 'pm' ? (hour % 12) + 12 : hour % 12, minute)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.darkSeg, on && { backgroundColor: '#6EE7B0' }]}
              >
                <AppText variant="smallStrong" color={on ? '#08261B' : '#9FC3B2'}>
                  {k.toUpperCase()}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Segmented
          dense
          style={{ marginTop: 16 }}
          value={pm ? 'pm' : 'am'}
          onChange={v => set(v === 'pm' ? (hour % 12) + 12 : hour % 12, minute)}
          options={[
            { key: 'am', label: 'AM' },
            { key: 'pm', label: 'PM' },
          ]}
        />
      )}
      <View style={styles.presets}>
        {PRESETS.map(p => {
          const on = p.h === hour && p.m === minute;
          return (
            <Pressable
              key={p.label}
              onPress={() => set(p.h, p.m)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.preset,
                {
                  backgroundColor: on ? colors.primary : dark ? 'rgba(255,255,255,0.06)' : colors.surfaceAlt,
                  borderColor: on ? colors.primary : dark ? 'rgba(255,255,255,0.14)' : colors.border,
                },
              ]}
            >
              <AppText variant="caption" color={on ? colors.onPrimary : dark ? '#9FC3B2' : colors.muted} style={{ fontWeight: '700' }}>
                {p.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Column({ value, onUp, onDown, label, fg, tone }) {
  return (
    <View style={styles.col}>
      <GlassButton icon={ChevronUp} label={`Increase ${label}`} onPress={onUp} size={44} tone={tone} />
      <Animated.Text key={value} entering={FadeIn.duration(140)} style={[styles.digits, { color: fg }]} accessibilityLabel={`${value} ${label}`}>
        {value}
      </Animated.Text>
      <GlassButton icon={ChevronDown} label={`Decrease ${label}`} onPress={onDown} size={44} tone={tone} />
    </View>
  );
}

export function TimePickerSheet({ visible, hour, minute, onClose, onSave, title = 'Reminder time' }) {
  const [t, setT] = useState({ hour, minute });
  useEffect(() => {
    if (visible) {
      setT({ hour, minute });
    }
  }, [visible, hour, minute]);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <TimeStepper hour={t.hour} minute={t.minute} onChange={setT} />
      <Button title="Save time" onPress={() => onSave(t)} style={{ marginTop: 18 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  col: { alignItems: 'center', gap: 6, width: 104 },
  digits: { fontSize: 56, lineHeight: 64, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  colon: { fontSize: 48, fontWeight: '300', marginHorizontal: 4 },
  darkToggle: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  darkSeg: { flex: 1, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  presets: { flexDirection: 'row', gap: 8, marginTop: 14, justifyContent: 'center', flexWrap: 'wrap' },
  preset: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
