import React, { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { requestPinWidget } from 'react-native-android-widget';
import { useNavigation } from '@react-navigation/native';
import {
  LayoutGrid,
  CircleGauge,
  BellRing,
  Clock,
  UserRound,
  Coins,
  Vibrate,
  Accessibility,
  PartyPopper,
  Flame,
  Download,
  Upload,
  Archive,
  Eraser,
  HardDrive,
  ShieldCheck,
  Info,
  FlaskConical,
  Check,
  SunMoon,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useData } from '../../store/data';
import { usePreferences } from '../../store/preferences';
import { useTheme } from '../../theme/ThemeProvider';
import { SectionScreen } from '../../components/screen';
import { AppText, Button, Divider, ListRow, Segmented, Surface, SwitchRow } from '../../components/ui';
import { BottomSheet } from '../../components/sheet';
import { useToast } from '../../components/feedback';
import { useSections, SECTION_INDEX } from '../../navigation/sectionContext';
import { CURRENCIES, getCurrency } from '../../utils/money';
import { exportBackup, pickBackup } from '../../services/backup';
import { formatDateKey, todayKey } from '../../utils/dates';
import { TimePickerSheet } from '../../components/timePicker';
import {
  cancelAllReminders,
  cancelDailyReminder,
  formatReminderTime,
  requestReminderPermission,
  scheduleDailyReminder,
} from '../../services/reminders';

const APP_VERSION = require('../../../package.json').version;

export function SettingsScreen() {
  const navigation = useNavigation();
  const sections = useSections();
  const { goals, transactions, stats, clearAllData, restoreFromBackup, seedDemoData, relabelCurrency } = useData();
  const { prefs, update, reset } = usePreferences();
  const { colors, osReduceMotion } = useTheme();
  const toast = useToast();
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(null);
  const archivedCount = goals.filter(g => g.status === 'ARCHIVED').length;

  const enableReminder = async (on, time) => {
    if (!on) {
      await cancelDailyReminder();
      update({ reminderEnabled: false });
      toast.show({ message: 'Daily reminder turned off' });
      return;
    }
    const allowed = await requestReminderPermission();
    if (!allowed) {
      update({ reminderEnabled: false });
      Alert.alert(
        'Notifications are off',
        'To get a daily reminder, allow notifications for Stashly in system settings.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const hour = time?.hour ?? prefs.reminderHour;
    const minute = time?.minute ?? prefs.reminderMinute;
    await scheduleDailyReminder({ hour, minute, goals, stats });
    update({ reminderEnabled: true, reminderHour: hour, reminderMinute: minute });
    toast.show({ message: `Reminder set for ${formatReminderTime(hour, minute)} every day` });
  };

  const addWidget = async widgetName => {
    try {
      const ok = await requestPinWidget({ widgetName });
      if (!ok) {
        toast.show({
          message: 'Your launcher can’t add widgets from here. Long-press your home screen → Widgets → Stashly.',
          tone: 'error',
          duration: 6000,
        });
      }
    } catch {
      toast.show({ message: 'Long-press your home screen → Widgets → Stashly', tone: 'error' });
    }
  };

  const doExport = async () => {
    setBusy('export');
    try {
      const res = await exportBackup(prefs);
      if (res.saved) {
        toast.show({ message: `Backup saved · ${res.counts.goals} goals, ${res.counts.transactions} entries` });
      }
    } catch (e) {
      toast.show({ message: `Backup failed: ${e.message || 'unknown error'}`, tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    setBusy('restore');
    try {
      const backup = await pickBackup();
      setBusy(null);
      if (!backup) {
        return;
      }
      Alert.alert(
        'Restore this backup?',
        `From ${backup.exportedAt ? formatDateKey(todayKey(new Date(backup.exportedAt)), 'full') : 'an earlier date'}: ${backup.goals.length} goals and ${backup.transactions.length} entries.\n\nThis replaces everything currently on this device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace & restore',
            style: 'destructive',
            onPress: async () => {
              setBusy('restore');
              try {
                await restoreFromBackup(backup);
                const p = backup.preferences || {};
                update({
                  currencyCode: CURRENCIES[p.currencyCode] ? p.currencyCode : prefs.currencyCode,
                  displayName: typeof p.displayName === 'string' ? p.displayName : prefs.displayName,
                  onboarded: true,
                });
                toast.show({ message: 'Backup restored' });
              } catch (e) {
                toast.show({ message: `Restore failed: ${e.message}`, tone: 'error' });
              } finally {
                setBusy(null);
              }
            },
          },
        ],
      );
    } catch (e) {
      setBusy(null);
      toast.show({ message: e.message || 'Couldn’t read that file', tone: 'error' });
    }
  };

  const changeCurrency = code => {
    setSheet(null);
    if (code === prefs.currencyCode) {
      return;
    }
    if (!goals.length) {
      update({ currencyCode: code });
      return;
    }
    const from = getCurrency(prefs.currencyCode);
    const to = getCurrency(code);
    Alert.alert(
      `Switch to ${to.name}?`,
      `Amounts are not converted. Every goal and entry will be relabelled — for example ${from.symbol}1,000 becomes ${to.symbol}1,000.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            await relabelCurrency(prefs.currencyCode, code);
            update({ currencyCode: code });
            toast.show({ message: `Currency set to ${to.code}` });
          },
        },
      ],
    );
  };

  const cur = getCurrency(prefs.currencyCode);

  return (
    <SectionScreen title="Settings" subtitle="Preferences and your data">
      <Group title="Profile">
        <ListRow icon={UserRound} title="Your name" value={prefs.displayName || 'Not set'} onPress={() => setSheet('name')} />
        <Divider inset={66} />
        <ListRow icon={Coins} title="Currency" value={`${cur.code} · ${cur.symbol.trim()}`} onPress={() => setSheet('currency')} />
      </Group>

      <Group title="Appearance & feel">
        <View style={{ padding: 16, paddingBottom: 10 }}>
          <AppText variant="bodyStrong" style={{ marginBottom: 10 }}>
            Theme
          </AppText>
          <Segmented
            value={prefs.themePreference}
            onChange={t => update({ themePreference: t })}
            options={[
              { key: 'system', label: 'System', icon: SunMoon },
              { key: 'light', label: 'Light', icon: Sun },
              { key: 'dark', label: 'Dark', icon: Moon },
            ]}
          />
        </View>
        <Divider inset={16} />
        <SwitchRow icon={Vibrate} title="Haptic feedback" subtitle="Also follows your device’s settings" value={prefs.hapticsEnabled} onValueChange={v => update({ hapticsEnabled: v })} />
        <Divider inset={66} />
        <SwitchRow
          icon={Accessibility}
          title="Reduce motion"
          subtitle={osReduceMotion ? 'On in system settings — always respected' : 'Minimise animations in Stashly'}
          value={prefs.reduceMotion || osReduceMotion}
          onValueChange={v => update({ reduceMotion: v })}
        />
        <Divider inset={66} />
        <SwitchRow icon={PartyPopper} title="Celebrations & milestones" subtitle="Subtle effects when you reach things" value={prefs.celebrations} onValueChange={v => update({ celebrations: v })} />
        <Divider inset={66} />
        <SwitchRow icon={Flame} title="Show saving streak" subtitle="Shown in Insights. No pressure, ever." value={prefs.showStreak} onValueChange={v => update({ showStreak: v })} />
      </Group>

      <Group title="Reminders">
        <SwitchRow
          icon={BellRing}
          title="Daily saving reminder"
          subtitle="A gentle nudge — never a guilt trip"
          value={prefs.reminderEnabled}
          onValueChange={v => enableReminder(v)}
        />
        <Divider inset={66} />
        <ListRow
          icon={Clock}
          title="Reminder time"
          value={formatReminderTime(prefs.reminderHour, prefs.reminderMinute)}
          onPress={() => setSheet('time')}
        />
      </Group>

      {Platform.OS === 'android' ? (
        <Group title="Home-screen widgets">
          <ListRow icon={LayoutGrid} title="Savings widget" subtitle="Total, this month and your goals · 4×2" onPress={() => addWidget('StashlyWidget')} />
          <Divider inset={66} />
          <ListRow icon={CircleGauge} title="Progress widget" subtitle="Overall progress ring · 2×2" onPress={() => addWidget('StashlyMiniWidget')} />
        </Group>
      ) : null}

      <Group title="Your data">
        <ListRow icon={Download} title="Export backup" subtitle="Save a file you control (JSON, includes images)" onPress={doExport} disabled={busy === 'export' || !goals.length} />
        <Divider inset={66} />
        <ListRow icon={Upload} title="Restore from backup" subtitle="Replace this device’s data with a backup file" onPress={doRestore} disabled={busy === 'restore'} />
        <Divider inset={66} />
        <ListRow
          icon={Archive}
          title="Archived goals"
          value={String(archivedCount)}
          onPress={() => sections.goTo(SECTION_INDEX.goals, { filter: 'archived' })}
        />
        <Divider inset={66} />
        <ListRow icon={Eraser} title="Clear all local data" subtitle="Delete every goal, entry, image and setting" danger onPress={() => setSheet('clear')} />
      </Group>

      <Group title="About">
        <ListRow icon={HardDrive} title="Stored only on this device" subtitle="Stashly works fully offline and has no network access. Nothing is uploaded." />
        <Divider inset={66} />
        <ListRow icon={ShieldCheck} title="Not a bank" subtitle="Stashly records money you set aside elsewhere. It never holds, moves or invests money." />
        <Divider inset={66} />
        <ListRow icon={Info} title="Version" value={APP_VERSION} />
      </Group>

      {__DEV__ ? (
        <Group title="Developer">
          <ListRow
            icon={FlaskConical}
            title="Load sample data"
            subtitle="DEV ONLY · replaces data with goals marked “(sample)”"
            onPress={() =>
              Alert.alert('Load sample data?', 'This replaces all current data with labelled sample goals.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Load', onPress: () => seedDemoData().then(() => toast.show({ message: 'Sample data loaded' })) },
              ])
            }
          />
        </Group>
      ) : null}

      <AppText variant="caption" tone="muted" center style={{ marginTop: 20 }}>
        Stashly · Save with intention. Buy with confidence.
      </AppText>

      <NameSheet visible={sheet === 'name'} value={prefs.displayName} onClose={() => setSheet(null)} onSave={n => { update({ displayName: n }); setSheet(null); }} />
      <BottomSheet visible={sheet === 'currency'} onClose={() => setSheet(null)} title="Currency">
        <ScrollView style={{ maxHeight: 440, marginHorizontal: -20 }}>
          {Object.values(CURRENCIES).map(c => (
            <ListRow
              key={c.code}
              title={`${c.name}`}
              subtitle={`${c.code} · ${c.symbol.trim()}`}
              onPress={() => changeCurrency(c.code)}
              right={c.code === prefs.currencyCode ? <Check size={20} color={colors.primary} /> : <View />}
            />
          ))}
        </ScrollView>
      </BottomSheet>
      <TimePickerSheet
        visible={sheet === 'time'}
        hour={prefs.reminderHour}
        minute={prefs.reminderMinute}
        onClose={() => setSheet(null)}
        onSave={async t => {
          setSheet(null);
          if (prefs.reminderEnabled) {
            await enableReminder(true, t);
          } else {
            update({ reminderHour: t.hour, reminderMinute: t.minute });
            toast.show({ message: `Time set to ${formatReminderTime(t.hour, t.minute)}. Turn the reminder on to use it.` });
          }
        }}
      />
      <ClearDataSheet
        visible={sheet === 'clear'}
        counts={{ goals: goals.length, transactions: transactions.length }}
        onClose={() => setSheet(null)}
        onConfirm={async () => {
          setSheet(null);
          await cancelAllReminders();
          await cancelDailyReminder();
          await clearAllData();
          reset();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          toast.show({ message: 'All local data cleared' });
        }}
      />
    </SectionScreen>
  );
}

function Group({ title, children }) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 22 }}>
      <AppText variant="overline" tone="muted" style={{ marginBottom: 8, marginLeft: 4 }}>
        {title}
      </AppText>
      <Surface padded={false} style={{ overflow: 'hidden' }}>
        {children}
      </Surface>
    </View>
  );
}

function NameSheet({ visible, value, onClose, onSave }) {
  const { colors } = useTheme();
  const [text, setText] = useState(value);
  React.useEffect(() => {
    if (visible) {
      setText(value);
    }
  }, [visible, value]);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Your name">
      <AppText variant="small" tone="muted" style={{ marginBottom: 10 }}>
        Used only for the greeting on Home.
      </AppText>
      <TextInput
        value={text}
        onChangeText={setText}
        autoFocus
        maxLength={40}
        placeholder="Name"
        placeholderTextColor={colors.faint}
        accessibilityLabel="Your name"
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
      />
      <Button title="Save" onPress={() => onSave(text.trim())} style={{ marginTop: 14 }} />
    </BottomSheet>
  );
}

/** Deliberate, two-step confirmation: the user must type DELETE. */
function ClearDataSheet({ visible, counts, onClose, onConfirm }) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [working, setWorking] = useState(false);
  React.useEffect(() => {
    if (visible) {
      setText('');
      setWorking(false);
    }
  }, [visible]);
  const ok = text.trim().toUpperCase() === 'DELETE';
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Clear all local data?">
      <AppText variant="body" tone="secondary">
        This permanently deletes {counts.goals} {counts.goals === 1 ? 'goal' : 'goals'}, {counts.transactions}{' '}
        {counts.transactions === 1 ? 'entry' : 'entries'}, product images, milestones and all settings from this device.
      </AppText>
      <View style={[styles.warn, { backgroundColor: colors.dangerSoft }]}>
        <AppText variant="small" color={colors.danger}>
          This can’t be undone. Export a backup first if you might want this data later.
        </AppText>
      </View>
      <AppText variant="smallStrong" tone="secondary" style={{ marginBottom: 8 }}>
        Type DELETE to confirm
      </AppText>
      <TextInput
        value={text}
        onChangeText={setText}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="DELETE"
        placeholderTextColor={colors.faint}
        accessibilityLabel="Type DELETE to confirm"
        style={[styles.input, { color: colors.text, borderColor: ok ? colors.danger : colors.border, backgroundColor: colors.surfaceAlt }]}
      />
      <Button
        title="Delete everything"
        variant="danger"
        icon={Eraser}
        disabled={!ok}
        loading={working}
        onPress={async () => {
          setWorking(true);
          await onConfirm();
        }}
        style={{ marginTop: 14 }}
        colorOverride={ok ? { bg: colors.danger, fg: '#FFFFFF' } : undefined}
      />
      <Button title="Cancel" variant="ghost" onPress={onClose} style={{ marginTop: 6 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: { height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 16 },
  warn: { padding: 12, borderRadius: 12, marginVertical: 14 },
});
