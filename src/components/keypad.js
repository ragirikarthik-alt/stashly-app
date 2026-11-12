import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Delete } from 'lucide-react-native';
import { BottomSheet } from './sheet';
import { AppText, Button } from './ui';
import { useTheme } from '../theme/ThemeProvider';
import { getCurrency, minorToInput, parseAmount, formatMoney } from '../utils/money';
import { useHaptics } from '../services/haptics';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

/** Exact-entry numeric keypad (accessible alternative to the dial gesture). */
export function KeypadSheet({ visible, onClose, onSubmit, initialMinor = 0, currency, title = 'Enter amount', dark = true, submitLabel = 'Use amount' }) {
  const { colors } = useTheme();
  const { fire } = useHaptics();
  const cur = getCurrency(currency);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      setText(initialMinor > 0 ? minorToInput(initialMinor, currency) : '');
      setError(null);
    }
  }, [visible, initialMinor, currency]);

  const press = k => {
    fire('tick');
    setError(null);
    setText(prev => {
      if (k === 'del') {
        return prev.slice(0, -1);
      }
      if (k === '.') {
        if (cur.decimals === 0 || prev.includes('.')) {
          return prev;
        }
        return (prev || '0') + '.';
      }
      const next = prev === '0' ? k : prev + k;
      const [, frac = ''] = next.split('.');
      if (next.includes('.') && frac.length > cur.decimals) {
        return prev;
      }
      if (next.replace('.', '').length > 11) {
        return prev;
      }
      return next;
    });
  };

  const submit = () => {
    const r = parseAmount(text, currency);
    if (!r.ok) {
      setError(r.error);
      fire('warning');
      return;
    }
    if (r.value <= 0) {
      setError('Amount must be greater than zero');
      fire('warning');
      return;
    }
    onSubmit(r.value);
  };

  const fg = dark ? '#F3F7F3' : colors.text;
  const keyBg = dark ? 'rgba(255,255,255,0.07)' : colors.surfaceAlt;
  const parsed = parseAmount(text || '0', currency);
  const display = text ? `${cur.symbol}${text}` : `${cur.symbol}0`;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} dark={dark}>
      <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`Amount ${parsed.ok ? formatMoney(parsed.value, currency) : text}`}>
        <Text style={[styles.display, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {display}
        </Text>
      </View>
      <AppText variant="caption" center color={error ? colors.danger : dark ? '#9FC3B2' : colors.muted} style={{ minHeight: 18 }}>
        {error || (cur.decimals ? `Up to ${cur.decimals} decimal places` : 'Whole amounts only')}
      </AppText>
      <View style={styles.grid}>
        {KEYS.map(k => {
          const disabled = k === '.' && cur.decimals === 0;
          return (
            <Pressable
              key={k}
              disabled={disabled}
              onPress={() => press(k)}
              onLongPress={k === 'del' ? () => setText('') : undefined}
              accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'Delete digit. Long press to clear' : k === '.' ? 'Decimal point' : k}
              style={({ pressed }) => [styles.key, { backgroundColor: pressed ? (dark ? 'rgba(255,255,255,0.16)' : colors.border) : keyBg, opacity: disabled ? 0.3 : 1 }]}
            >
              {k === 'del' ? <Delete size={24} color={fg} /> : <Text style={[styles.keyText, { color: fg }]}>{k}</Text>}
            </Pressable>
          );
        })}
      </View>
      <Button
        title={submitLabel}
        onPress={submit}
        style={{ marginTop: 14 }}
        colorOverride={dark ? { bg: '#6EE7B0', fg: '#08261B' } : undefined}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 46, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'], marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 12 },
  key: { width: '31.5%', height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: '500' },
});
