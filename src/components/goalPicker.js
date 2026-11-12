import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { BottomSheet } from './sheet';
import { AppText } from './ui';
import { GoalVisual } from './goal';
import { useData } from '../store/data';
import { useTheme } from '../theme/ThemeProvider';
import { formatMoney } from '../utils/money';
import { STATUS } from '../services/calculations';

export function GoalPickerSheet({ visible, onClose, value, onChange, dark = true, title = 'Which goal?' }) {
  const { goals, stats } = useData();
  const { colors } = useTheme();
  const visibleGoals = goals.filter(g => g.status !== STATUS.ARCHIVED);
  const fg = dark ? '#F3F7F3' : colors.text;
  const muted = dark ? '#9FC3B2' : colors.muted;
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} dark={dark}>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 8 }}>
        {visibleGoals.map(g => {
          const s = stats.get(g.id);
          const selected = g.id === value;
          return (
            <Pressable
              key={g.id}
              onPress={() => onChange(g.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${g.name}, ${formatMoney(s.balance, g.currencyCode)} of ${formatMoney(g.targetAmount, g.currencyCode)}`}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: selected ? (dark ? 'rgba(110,231,176,0.14)' : colors.primarySoft) : pressed ? (dark ? 'rgba(255,255,255,0.06)' : colors.surfaceAlt) : 'transparent' },
              ]}
            >
              <GoalVisual goal={g} size={46} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" color={fg} numberOfLines={1}>
                  {g.name}
                </AppText>
                <AppText variant="caption" color={muted} numeric>
                  {formatMoney(s.balance, g.currencyCode)} of {formatMoney(g.targetAmount, g.currencyCode)} · {s.percent}%
                </AppText>
              </View>
              {selected ? <Check size={20} color={dark ? '#6EE7B0' : colors.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, marginBottom: 4 },
});
