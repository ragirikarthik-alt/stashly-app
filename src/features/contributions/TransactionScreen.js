import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, CalendarDays, Target, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { useData, ValidationError } from '../../store/data';
import { useTheme } from '../../theme/ThemeProvider';
import { StackHeader } from '../../components/screen';
import { AppText, Button, Field, SelectField, Segmented, Surface } from '../../components/ui';
import { KeypadSheet } from '../../components/keypad';
import { GoalPickerSheet } from '../../components/goalPicker';
import { DatePickerSheet } from '../../components/calendar';
import { useToast } from '../../components/feedback';
import { formatMoney } from '../../utils/money';
import { formatDateKey, formatTime, todayKey } from '../../utils/dates';
import { TX } from '../../services/calculations';
import { useHaptics } from '../../services/haptics';

export function TransactionScreen({ navigation, route }) {
  const { txId } = route.params;
  const { transactions, goals, updateTransaction, deleteTransaction, restoreTransaction } = useData();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { fire } = useHaptics();
  const tx = transactions.find(t => t.id === txId);
  const [draft, setDraft] = useState(tx);
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const leaving = useRef(false);

  // If the entry disappears underneath us (e.g. deleted elsewhere), leave once.
  useEffect(() => {
    if (!tx && !leaving.current && navigation.isFocused()) {
      leaving.current = true;
      navigation.goBack();
    }
  }, [tx, navigation]);

  if (!tx || !draft) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const goal = goals.find(g => g.id === draft.goalId);
  const isW = draft.type === TX.WITHDRAWAL;
  const dirty =
    draft.amount !== tx.amount ||
    draft.date !== tx.date ||
    draft.goalId !== tx.goalId ||
    draft.type !== tx.type ||
    (draft.note || '') !== (tx.note || '');

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateTransaction(tx.id, draft);
      fire('confirm');
      leaving.current = true;
      navigation.goBack();
      toast.show({ message: 'Entry updated' });
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : 'Couldn’t save changes. Please try again.');
      fire('error');
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete this entry?', `${isW ? 'Withdrawal' : 'Contribution'} of ${formatMoney(tx.amount, tx.currencyCode)} on ${formatDateKey(tx.date, 'long')}. Totals will be recalculated.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            leaving.current = true;
            await deleteTransaction(tx.id);
            fire('medium');
            navigation.goBack();
            toast.show({
              message: 'Entry deleted',
              action: {
                label: 'Undo',
                onPress: () => restoreTransaction(tx.id).catch(e => toast.show({ message: e.message, tone: 'error' })),
              },
            });
          } catch (e) {
            leaving.current = false;
            setError(e.message || 'Couldn’t delete this entry');
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title={isW ? 'Withdrawal' : 'Contribution'} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => setSheet('keypad')}
          accessibilityRole="button"
          accessibilityLabel={`Amount ${formatMoney(draft.amount, draft.currencyCode)}. Tap to edit`}
          style={[styles.amountCard, { backgroundColor: isW ? colors.withdrawSoft : colors.primarySoft }]}
        >
          {isW ? <ArrowDownLeft size={22} color={colors.withdraw} /> : <ArrowUpRight size={22} color={colors.primary} />}
          <AppText variant="display" numeric color={isW ? colors.withdraw : colors.text}>
            {formatMoney(draft.amount, draft.currencyCode)}
          </AppText>
          <AppText variant="caption" tone="muted">
            Tap to change amount
          </AppText>
        </Pressable>

        <Segmented
          style={{ marginTop: 20, marginBottom: 20 }}
          value={draft.type}
          onChange={t => setDraft(d => ({ ...d, type: t }))}
          options={[
            { key: TX.CONTRIBUTION, label: 'Contribution' },
            { key: TX.WITHDRAWAL, label: 'Withdrawal' },
          ]}
        />

        <SelectField label="Goal" icon={Target} value={goal?.name} placeholder="Choose a goal" onPress={() => setSheet('goal')} />
        <SelectField label="Date" icon={CalendarDays} value={formatDateKey(draft.date, 'long')} onPress={() => setSheet('date')} />
        <Field
          label="Note"
          value={draft.note || ''}
          onChangeText={t => setDraft(d => ({ ...d, note: t }))}
          placeholder="Optional"
          maxLength={280}
        />

        {error ? (
          <AppText variant="smallStrong" tone="danger" style={{ marginBottom: 12 }} accessibilityLiveRegion="assertive">
            {error}
          </AppText>
        ) : null}

        <Button title="Save changes" onPress={save} disabled={!dirty} loading={saving} />
        <Button title="Delete entry" variant="danger" icon={Trash2} onPress={remove} style={{ marginTop: 12 }} disabled={saving} />

        <Surface style={{ marginTop: 24 }}>
          <AppText variant="caption" tone="muted">
            Recorded {formatDateKey(toLocalKey(tx.createdAt), 'full')} at {formatTime(tx.createdAt)}
            {tx.updatedAt !== tx.createdAt ? ` · Last edited ${formatDateKey(toLocalKey(tx.updatedAt), 'full')} at ${formatTime(tx.updatedAt)}` : ''}
            {tx.source ? ` · Added from ${tx.source}` : ''}
          </AppText>
        </Surface>
      </ScrollView>

      <KeypadSheet
        visible={sheet === 'keypad'}
        dark={false}
        currency={draft.currencyCode}
        initialMinor={draft.amount}
        onClose={() => setSheet(null)}
        onSubmit={v => {
          setDraft(d => ({ ...d, amount: v }));
          setSheet(null);
        }}
      />
      <GoalPickerSheet
        visible={sheet === 'goal'}
        dark={false}
        value={draft.goalId}
        onClose={() => setSheet(null)}
        onChange={id => {
          setDraft(d => ({ ...d, goalId: id }));
          setSheet(null);
        }}
      />
      <DatePickerSheet
        visible={sheet === 'date'}
        value={draft.date}
        maxDate={todayKey()}
        onClose={() => setSheet(null)}
        onChange={k => {
          setDraft(d => ({ ...d, date: k }));
          setSheet(null);
        }}
      />
    </View>
  );
}

/** ISO timestamp → local date key (timestamps are UTC; display in local time). */
function toLocalKey(iso) {
  return todayKey(new Date(iso));
}

const styles = StyleSheet.create({
  amountCard: { alignItems: 'center', paddingVertical: 28, borderRadius: 24, gap: 6 },
});
