import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History } from 'lucide-react-native';
import { useData } from '../../store/data';
import { useTheme } from '../../theme/ThemeProvider';
import { StackHeader } from '../../components/screen';
import { AppText, EmptyState, Segmented } from '../../components/ui';
import { TransactionRow } from '../../components/goal';
import { formatMoney } from '../../utils/money';
import { formatDateKey } from '../../utils/dates';
import { TX, sortTransactionsDesc } from '../../services/calculations';
import { usePreferences } from '../../store/preferences';

export function HistoryScreen({ navigation, route }) {
  const goalId = route.params?.goalId;
  const { transactions, goals } = useData();
  const { prefs } = usePreferences();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const goal = goals.find(g => g.id === goalId);
  const goalMap = useMemo(() => new Map(goals.map(g => [g.id, g])), [goals]);
  const currency = goal?.currencyCode || prefs.currencyCode;

  const sections = useMemo(() => {
    let list = transactions;
    if (goalId) {
      list = list.filter(t => t.goalId === goalId);
    }
    if (filter === 'in') {
      list = list.filter(t => t.type === TX.CONTRIBUTION);
    } else if (filter === 'out') {
      list = list.filter(t => t.type === TX.WITHDRAWAL);
    }
    const byDate = new Map();
    for (const t of sortTransactionsDesc(list)) {
      if (!byDate.has(t.date)) {
        byDate.set(t.date, []);
      }
      byDate.get(t.date).push(t);
    }
    return [...byDate.entries()].map(([date, data]) => ({
      date,
      data,
      net: data.reduce((s, t) => s + (t.type === TX.WITHDRAWAL ? -t.amount : t.amount), 0),
    }));
  }, [transactions, goalId, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title={goal ? `${goal.name} · History` : 'All activity'} />
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          dense
          options={[
            { key: 'all', label: 'All' },
            { key: 'in', label: 'Saved' },
            { key: 'out', label: 'Withdrawals' },
          ]}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={t => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { borderColor: colors.border }]}>
            <AppText variant="smallStrong" tone="secondary">
              {formatDateKey(section.date, 'relative')}
            </AppText>
            <AppText variant="caption" tone="muted" numeric>
              Net {formatMoney(section.net, currency, { sign: true })}
            </AppText>
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            goal={goalMap.get(item.goalId)}
            showDate={false}
            showGoal={!goalId}
            onPress={() => navigation.navigate('Transaction', { txId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon={History} title="Nothing here yet" message="Contributions and withdrawals you record will appear here." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
});
