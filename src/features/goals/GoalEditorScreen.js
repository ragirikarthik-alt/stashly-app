import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImagePlus, Camera, Images, Trash2, CalendarDays, Info, Link } from 'lucide-react-native';
import { useData, ValidationError } from '../../store/data';
import { usePreferences } from '../../store/preferences';
import { useTheme } from '../../theme/ThemeProvider';
import { CATEGORIES, PRIORITIES } from '../../theme/tokens';
import { StackHeader } from '../../components/screen';
import { AppText, Button, Chip, Field, ListRow, SelectField, Surface } from '../../components/ui';
import { GoalVisual, categoryIconComponent } from '../../components/goal';
import { BottomSheet } from '../../components/sheet';
import { DatePickerSheet } from '../../components/calendar';
import { useToast } from '../../components/feedback';
import { deleteGoalImage, pickGoalImage } from '../../services/images';
import { suggestedContribution } from '../../services/predictions';
import { formatMoney, getCurrency, minorFactor, minorToInput, parseAmount } from '../../utils/money';
import { addDays, formatDateKey, todayKey } from '../../utils/dates';
import { useHaptics } from '../../services/haptics';

export function GoalEditorScreen({ navigation, route }) {
  const goalId = route.params?.goalId;
  const { goals, stats, createGoal, updateGoal } = useData();
  const { prefs } = usePreferences();
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { fire } = useHaptics();
  const existing = goals.find(g => g.id === goalId);
  const currency = existing?.currencyCode || prefs.currencyCode;
  const cur = getCurrency(currency);

  const [name, setName] = useState(existing?.name || '');
  const [targetText, setTargetText] = useState(existing ? minorToInput(existing.targetAmount, currency) : '');
  const [category, setCategory] = useState(existing?.category || null);
  const [priority, setPriority] = useState(existing?.priority || null);
  const [targetDate, setTargetDate] = useState(existing?.targetDate || null);
  const [productUrl, setProductUrl] = useState(existing?.productUrl || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [imageUri, setImageUri] = useState(existing?.imageUri || null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(null);

  // Clean up images picked in this session if the editor is dismissed without saving.
  const picked = useRef([]);
  const saved = useRef(false);
  useEffect(
    () => () => {
      if (!saved.current) {
        picked.current.forEach(deleteGoalImage);
      }
    },
    [],
  );

  const parsedTarget = parseAmount(targetText, currency);
  const balance = existing ? stats.get(existing.id)?.balance ?? 0 : 0;
  const suggestion = useMemo(() => {
    if (!parsedTarget.ok || !targetDate) {
      return null;
    }
    return suggestedContribution({
      target: Math.max(parsedTarget.value - balance, 0),
      today: todayKey(),
      targetDate,
      unit: minorFactor(currency),
    });
  }, [parsedTarget.ok, parsedTarget.value, targetDate, balance, currency]);

  const targetChanged = existing && parsedTarget.ok && parsedTarget.value !== existing.targetAmount;

  const pick = async source => {
    setSheet(null);
    try {
      const uri = await pickGoalImage({ source });
      if (uri) {
        picked.current.push(uri);
        setImageUri(uri);
      }
    } catch (e) {
      toast.show({ message: e.message || 'Couldn’t use that image', tone: 'error' });
    }
  };

  const save = async () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Give your goal a name';
    }
    if (!parsedTarget.ok) {
      errs.target = parsedTarget.error;
    } else if (parsedTarget.value <= 0) {
      errs.target = 'Target must be greater than zero';
    }
    if (productUrl.trim() && !/^https?:\/\/\S+\.\S+/i.test(productUrl.trim())) {
      errs.url = 'Enter a full link starting with http:// or https://';
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      fire('warning');
      return;
    }
    setSaving(true);
    const input = {
      name: name.trim(),
      targetAmount: parsedTarget.value,
      category,
      priority,
      targetDate,
      productUrl: productUrl.trim() || null,
      notes: notes.trim() || null,
      imageUri,
    };
    try {
      if (existing) {
        await updateGoal(existing.id, input);
        // Keep only the final image; remove other images picked this session.
        picked.current.filter(u => u !== imageUri).forEach(deleteGoalImage);
        saved.current = true;
        fire('confirm');
        navigation.goBack();
        toast.show({ message: 'Goal updated' });
      } else {
        const g = await createGoal(input);
        picked.current.filter(u => u !== imageUri).forEach(deleteGoalImage);
        saved.current = true;
        fire('confirm');
        navigation.replace('GoalDetail', { goalId: g.id });
        toast.show({ message: `${g.name} added` });
      }
    } catch (e) {
      setErrors({ form: e instanceof ValidationError ? e.message : 'Couldn’t save the goal. Please try again.' });
      fire('error');
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title={existing ? 'Edit goal' : 'New goal'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          {/* image */}
          <Pressable
            onPress={() => setSheet('image')}
            accessibilityRole="button"
            accessibilityLabel={imageUri ? 'Change product image' : 'Add a product image (optional)'}
            style={[styles.imagePick, { borderRadius: radius.xl, borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <GoalVisual goal={{ name: name || 'Goal', imageUri, category }} size={120} radius={radius.lg} />
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="bodyStrong">{imageUri ? 'Product image' : 'Add a picture'}</AppText>
              <AppText variant="caption" tone="muted">
                {imageUri ? 'Tap to change or remove' : 'Optional. Without one, we’ll use an illustration for the category.'}
              </AppText>
              <View style={styles.inlineIcon}>
                <ImagePlus size={16} color={colors.primary} />
                <AppText variant="smallStrong" tone="primary">
                  {imageUri ? 'Change' : 'Choose image'}
                </AppText>
              </View>
            </View>
          </Pressable>

          <View style={{ height: 22 }} />
          <Field label="What are you saving for?" value={name} onChangeText={setName} placeholder="e.g. Noise-cancelling headphones" maxLength={80} error={errors.name} autoCapitalize="sentences" returnKeyType="next" />
          <Field
            label={`Target amount (${cur.code})`}
            value={targetText}
            onChangeText={t => setTargetText(t.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            keyboardType={cur.decimals ? 'decimal-pad' : 'number-pad'}
            error={errors.target}
            inputStyle={{ fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] }}
            right={<AppText variant="h3" tone="muted">{cur.symbol.trim()}</AppText>}
            hint={parsedTarget.ok && parsedTarget.value > 0 ? formatMoney(parsedTarget.value, currency) : undefined}
          />
          {targetChanged ? (
            <View style={[styles.note, { backgroundColor: colors.warningSoft }]}>
              <Info size={16} color={colors.textSecondary} />
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                Changing the target updates progress and estimates. Your saved history stays exactly as it is
                {balance > 0 ? ` (${formatMoney(balance, currency)} saved so far).` : '.'}
              </AppText>
            </View>
          ) : null}

          <AppText variant="smallStrong" tone="secondary" style={{ marginBottom: 8 }}>
            Category
          </AppText>
          <View style={styles.chips}>
            {CATEGORIES.map(c => (
              <Chip
                key={c.key}
                label={c.key}
                selected={category === c.key}
                icon={categoryIconComponent(c.key)}
                onPress={() => setCategory(category === c.key ? null : c.key)}
              />
            ))}
          </View>

          <AppText variant="smallStrong" tone="secondary" style={{ marginBottom: 8, marginTop: 18 }}>
            Priority
          </AppText>
          <View style={styles.chips}>
            {PRIORITIES.map(p => (
              <Chip key={p} label={p} selected={priority === p} onPress={() => setPriority(priority === p ? null : p)} />
            ))}
          </View>

          <View style={{ height: 18 }} />
          <SelectField
            label="Target purchase date"
            icon={CalendarDays}
            value={targetDate ? formatDateKey(targetDate, 'long') : null}
            placeholder="Optional"
            onPress={() => setSheet('date')}
            onClear={() => setTargetDate(null)}
          />
          {suggestion ? (
            <Surface style={{ marginTop: -6, marginBottom: 18, backgroundColor: colors.primarySoft, borderWidth: 0 }}>
              <AppText variant="smallStrong" color={colors.scheme === 'dark' ? colors.primary : colors.primaryPressed}>
                Suggested pace
              </AppText>
              <AppText variant="small" tone="secondary" style={{ marginTop: 4 }} numeric>
                About {formatMoney(suggestion.perDay, currency)} a day or {formatMoney(suggestion.perWeek, currency)} a week reaches{' '}
                {formatMoney(parsedTarget.value, currency)} by {formatDateKey(targetDate, 'full')} ({suggestion.days} days).
              </AppText>
            </Surface>
          ) : null}

          <Field
            label="Product link"
            value={productUrl}
            onChangeText={setProductUrl}
            placeholder="https:// (optional)"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.url}
            right={<Link size={18} color={colors.faint} />}
          />
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline maxLength={1000} inputStyle={{ minHeight: 80, textAlignVertical: 'top' }} />

          {errors.form ? (
            <AppText variant="smallStrong" tone="danger" style={{ marginBottom: 12 }}>
              {errors.form}
            </AppText>
          ) : null}
          <Button title={existing ? 'Save changes' : 'Create goal'} onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={sheet === 'image'} onClose={() => setSheet(null)} title="Product image">
        <View style={{ marginHorizontal: -20 }}>
          <ListRow icon={Images} title="Choose from gallery" onPress={() => pick('library')} />
          <ListRow icon={Camera} title="Take a photo" onPress={() => pick('camera')} />
          {imageUri ? (
            <ListRow
              icon={Trash2}
              title="Remove image"
              subtitle="Use the category illustration instead"
              danger
              onPress={() => {
                setImageUri(null);
                setSheet(null);
              }}
            />
          ) : null}
        </View>
      </BottomSheet>
      <DatePickerSheet
        visible={sheet === 'date'}
        title="Target purchase date"
        value={targetDate}
        minDate={addDays(todayKey(), 1)}
        allowClear
        onClear={() => {
          setTargetDate(null);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
        onChange={k => {
          setTargetDate(k);
          setSheet(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  imagePick: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderWidth: 1, borderStyle: 'dashed' },
  inlineIcon: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, marginTop: -6, marginBottom: 18 },
});
