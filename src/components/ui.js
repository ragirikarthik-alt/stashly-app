import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme/tokens';
import { GlassButton } from './glass';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ---------------- Text ---------------- */

export function AppText({ variant = 'body', color, tone, numeric, center, style, children, ...rest }) {
  const { colors, type } = useTheme();
  const toneColor =
    tone === 'muted'
      ? colors.muted
      : tone === 'secondary'
      ? colors.textSecondary
      : tone === 'primary'
      ? colors.primary
      : tone === 'danger'
      ? colors.danger
      : tone === 'withdraw'
      ? colors.withdraw
      : colors.text;
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[
        type[variant],
        { color: color || toneColor },
        numeric && styles.numeric,
        center && styles.center,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

/* ---------------- Pressable with spring scale ---------------- */

export function PressableScale({ onPress, style, children, scaleTo = 0.97, disabled, ...rest }) {
  const { reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withTiming(scaleTo, { duration: 90 });
    }
  }, [reduceMotion, scale, scaleTo]);
  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 140 });
  }, [scale]);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[style, aStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ---------------- Buttons ---------------- */

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  size = 'lg',
  style,
  accessibilityLabel,
  colorOverride,
}) {
  const { colors, radius } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
    secondary: { bg: colors.primarySoft, fg: colors.scheme === 'dark' ? colors.primary : colors.primaryPressed, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
    withdraw: { bg: colors.withdrawSoft, fg: colors.withdraw, border: 'transparent' },
  }[variant];
  const p = colorOverride ? { ...palette, ...colorOverride } : palette;
  const height = size === 'lg' ? 54 : size === 'md' ? 46 : 38;
  const isDisabled = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={[
        styles.button,
        {
          height,
          backgroundColor: p.bg,
          borderColor: p.border,
          borderRadius: radius.pill,
          paddingHorizontal: size === 'sm' ? 14 : 22,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {Icon ? <Icon size={size === 'sm' ? 16 : 19} color={p.fg} strokeWidth={2.2} /> : null}
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.buttonText, { color: p.fg, fontSize: size === 'sm' ? 14 : 16 }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({ icon: Icon, onPress, label, size = 44, color, background, iconSize = 20, style, disabled, tone }) {
  const { colors } = useTheme();
  if (background === undefined) {
    // Default navigation/action buttons use the liquid-glass look.
    return <GlassButton icon={Icon} onPress={onPress} label={label} size={size} iconSize={iconSize} color={color} disabled={disabled} style={style} tone={tone} />;
  }
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      scaleTo={0.9}
      style={[
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background ?? colors.surfaceAlt, opacity: disabled ? 0.4 : 1 },
        style,
      ]}
    >
      <Icon size={iconSize} color={color || colors.text} strokeWidth={2} />
    </PressableScale>
  );
}

/* ---------------- Surfaces ---------------- */

export function Surface({ style, children, padded = true, raised, ...rest }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: raised ? colors.surfaceRaised : colors.surface,
          borderRadius: radius.lg,
          borderWidth: colors.scheme === 'light' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
          padding: padded ? 16 : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function Divider({ inset = 0, style }) {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }, style]} />;
}

export function SectionTitle({ title, action, onAction, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionTitle, style]}>
      <AppText variant="h3" accessibilityRole="header">
        {title}
      </AppText>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <AppText variant="smallStrong" color={colors.primary}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------------- Chips & segmented ---------------- */

export function Chip({ label, selected, onPress, icon: Icon, style, compact }) {
  const { colors, radius } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        {
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          paddingVertical: compact ? 6 : 9,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={15} color={selected ? colors.onPrimary : colors.muted} strokeWidth={2.2} /> : null}
      <AppText variant="smallStrong" color={selected ? colors.onPrimary : colors.textSecondary}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** Animated segmented control. options: [{ key, label, icon? }] */
export function Segmented({ options, value, onChange, style, dense }) {
  const { colors, radius, reduceMotion } = useTheme();
  const [width, setWidth] = React.useState(0);
  const index = Math.max(0, options.findIndex(o => o.key === value));
  const x = useSharedValue(0);
  const segW = width / options.length;
  React.useEffect(() => {
    x.value = reduceMotion ? index * segW : withTiming(index * segW, { duration: 220 });
  }, [index, segW, reduceMotion, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View
      accessibilityRole="tablist"
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={[styles.segmented, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, height: dense ? 36 : 42 }, style]}
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.segThumb,
            { width: segW - 6, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, shadowColor: colors.shadow },
            thumb,
          ]}
        />
      )}
      {options.map(o => {
        const active = o.key === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.a11y || o.label}
            style={styles.segItem}
          >
            {Icon ? <Icon size={15} color={active ? colors.text : colors.muted} strokeWidth={2.2} /> : null}
            <AppText variant="smallStrong" color={active ? colors.text : colors.muted} numberOfLines={1}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- Form fields ---------------- */

export function Field({ label, hint, error, style, inputStyle, right, ...input }) {
  const { colors, radius, type } = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[{ marginBottom: 18 }, style]}>
      {label ? (
        <AppText variant="smallStrong" tone="secondary" style={{ marginBottom: 8 }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.fieldWrap,
          {
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={colors.faint}
          selectionColor={colors.primary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          maxFontSizeMultiplier={1.5}
          style={[type.body, styles.fieldInput, { color: colors.text }, inputStyle]}
          {...input}
        />
        {right}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" style={{ marginTop: 6 }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Tappable field-looking row that opens a picker. */
export function SelectField({ label, value, placeholder, onPress, icon: Icon, onClear }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ marginBottom: 18 }}>
      <AppText variant="smallStrong" tone="secondary" style={{ marginBottom: 8 }}>
        {label}
      </AppText>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        style={[styles.fieldWrap, styles.selectField, { borderRadius: radius.md, backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {Icon ? <Icon size={18} color={colors.muted} /> : null}
        <AppText style={{ flex: 1 }} color={value ? colors.text : colors.faint}>
          {value || placeholder}
        </AppText>
        {value && onClear ? (
          <Pressable onPress={onClear} hitSlop={10} accessibilityLabel={`Clear ${label}`}>
            <AppText variant="smallStrong" tone="primary">
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

/* ---------------- Settings rows ---------------- */

export function ListRow({ icon: Icon, title, subtitle, value, onPress, right, danger, iconTint, disabled }) {
  const { colors } = useTheme();
  const tint = danger ? colors.danger : iconTint || colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.listRow, { opacity: disabled ? 0.5 : 1, backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
    >
      {Icon ? (
        <View style={[styles.listIcon, { backgroundColor: alpha(danger ? '#C2453D' : '#167A58', colors.scheme === 'dark' ? 0.22 : 0.1) }]}>
          <Icon size={18} color={tint} strokeWidth={2.1} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" color={danger ? colors.danger : colors.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="small" tone="muted">
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress && !right ? <ChevronRight size={18} color={colors.faint} /> : null}
    </Pressable>
  );
}

export function SwitchRow({ icon, title, subtitle, value, onValueChange }) {
  const { colors } = useTheme();
  return (
    <ListRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      onPress={() => onValueChange(!value)}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={title}
          trackColor={{ false: colors.borderStrong, true: colors.primary }}
          thumbColor={colors.scheme === 'dark' && value ? colors.onPrimary : '#FFFFFF'}
        />
      }
    />
  );
}

/* ---------------- Empty state ---------------- */

export function EmptyState({ icon: Icon, title, message, action, onAction, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, style]}>
      {Icon ? (
        <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
          <Icon size={26} color={colors.primary} strokeWidth={2} />
        </View>
      ) : null}
      <AppText variant="h3" center>
        {title}
      </AppText>
      {message ? (
        <AppText variant="small" tone="muted" center style={{ marginTop: 6, maxWidth: 300 }}>
          {message}
        </AppText>
      ) : null}
      {action ? <Button title={action} onPress={onAction} size="md" style={{ marginTop: 18 }} /> : null}
    </View>
  );
}

export function Pill({ label, color, background, icon: Icon }) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {Icon ? <Icon size={12} color={color} strokeWidth={2.4} /> : null}
      <Text style={[styles.pillText, { color }]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  numeric: { fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  buttonText: { fontWeight: '700', letterSpacing: 0.1 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderWidth: 1 },
  segmented: { flexDirection: 'row', padding: 3, position: 'relative' },
  segThumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 30 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, paddingHorizontal: 14, minHeight: 52 },
  fieldInput: { flex: 1, paddingVertical: 12 },
  selectField: { gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 13, minHeight: 56 },
  listIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
