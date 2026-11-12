import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useSections } from '../navigation/sectionContext';
import { AppText, IconButton } from './ui';

/** Small dots showing which of the five sections is visible (swipe affordance). */
export function SectionDots() {
  const sections = useSections();
  const { colors } = useTheme();
  if (!sections) {
    return null;
  }
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityLabel={`Section ${sections.index + 1} of ${sections.sections.length}. Swipe left or right, or use the compass, to switch sections.`}
    >
      {sections.sections.map((s, i) => (
        <Dot key={s.key} active={i === sections.index} colors={colors} />
      ))}
    </View>
  );
}

function Dot({ active, colors }) {
  const { reduceMotion } = useTheme();
  const style = useAnimatedStyle(() => ({
    width: reduceMotion ? (active ? 18 : 6) : withTiming(active ? 18 : 6, { duration: 220 }),
    backgroundColor: active ? colors.primary : colors.borderStrong,
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Layout for the five main sections. Leaves room on the right for the compass. */
export function SectionScreen({ title, subtitle, eyebrow, right, children, scroll = true, contentStyle, refreshControl }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={{ flex: 1, paddingRight: 64 }}>
        {eyebrow ? (
          <AppText variant="overline" tone="muted" style={{ marginBottom: 4 }}>
            {eyebrow}
          </AppText>
        ) : null}
        {title ? (
          <AppText variant="h1" accessibilityRole="header" numberOfLines={2}>
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="small" tone="muted" style={{ marginTop: 4 }}>
            {subtitle}
          </AppText>
        ) : null}
        <SectionDots />
      </View>
      {right}
    </View>
  );
  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {header}
        <View style={[styles.flex, contentStyle]}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[{ paddingBottom: insets.bottom + 40 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      {children}
    </ScrollView>
  );
}

/** Header for pushed (stack) screens with predictable back navigation. */
export function StackHeader({ title, right, onBack, transparent, dark }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fg = dark ? '#F3F7F3' : colors.text;
  return (
    <View style={[styles.stackHeader, { paddingTop: insets.top + 8, backgroundColor: transparent ? 'transparent' : colors.background }]}>
      <IconButton
        icon={ArrowLeft}
        label="Back"
        onPress={onBack || (() => navigation.goBack())}
        tone={dark ? 'dark' : undefined}
        color={fg}
      />
      <AppText variant="h3" color={fg} numberOfLines={1} style={styles.stackTitle} accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.stackRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 18 },
  dots: { flexDirection: 'row', gap: 5, marginTop: 12, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  stackHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  stackTitle: { flex: 1 },
  stackRight: { flexDirection: 'row', gap: 8, minWidth: 44, justifyContent: 'flex-end' },
});
