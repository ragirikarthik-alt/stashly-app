import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass as CompassIcon, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from '../components/ui';
import { Glass, GlassButton } from '../components/glass';
import { useHaptics } from '../services/haptics';

const BUTTON = 52;
const ITEM = 48;
const RADIUS = 195;
const LABEL_W = 96;

/**
 * Floating Navigation Compass — replaces a bottom tab bar.
 * Tapping expands a radial menu of the five sections, fanned out from the
 * top-right corner (left → down). Tap outside or press back to close.
 */
export function NavigationCompass({ sections, index, onSelect }) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { fire } = useHaptics();
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const needle = useSharedValue(0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(open ? 1 : 0, { duration: 0 })
      : open
      ? withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) })
      : withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) });
  }, [open, reduceMotion, progress]);

  useEffect(() => {
    needle.value = reduceMotion ? index * 72 : withTiming(index * 72, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [index, reduceMotion, needle]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  const toggle = useCallback(() => {
    fire('light');
    setOpen(o => !o);
  }, [fire]);

  const choose = useCallback(
    i => {
      fire('tick');
      setOpen(false);
      onSelect(i);
    },
    [fire, onSelect],
  );

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const buttonIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ rotate: `${needle.value - 45 * progress.value}deg` }],
  }));
  const closeIconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ rotate: `${-90 + 90 * progress.value}deg` }],
  }));

  const top = insets.top + 10;
  const right = 16;

  return (
    <>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close navigation" accessibilityRole="button" />
      </Animated.View>

      <View pointerEvents="box-none" style={[styles.anchor, { top, right, width: BUTTON, height: BUTTON }]}>
        {sections.map((s, i) => (
          <CompassItem
            key={s.key}
            section={s}
            i={i}
            count={sections.length}
            progress={progress}
            active={i === index}
            open={open}
            onPress={() => choose(i)}
            colors={colors}
          />
        ))}
        <GlassButton
          onPress={toggle}
          size={BUTTON}
          active={open}
          label={open ? 'Close navigation' : `Navigation. Current section: ${sections[index].label}`}
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, buttonIconStyle]}>
            <CompassIcon size={24} color={colors.primary} strokeWidth={2} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, closeIconStyle]}>
            <X size={22} color={colors.onPrimary} strokeWidth={2.4} />
          </Animated.View>
        </GlassButton>
      </View>
    </>
  );
}

function CompassItem({ section, i, count, progress, active, open, onPress, colors }) {
  // Fan from 180° (left) to 270° (down); screen y grows downward.
  const angle = Math.PI + (Math.PI / 2) * (i / (count - 1));
  const dx = Math.cos(angle) * RADIUS;
  const dy = -Math.sin(angle) * RADIUS;
  const stagger = i * 0.06;
  const Icon = section.icon;

  const style = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [stagger, Math.min(1, stagger + 0.75)], [0, 1], 'clamp');
    return {
      opacity: t,
      transform: [{ translateX: dx * t }, { translateY: dy * t }, { scale: 0.4 + 0.6 * t }],
    };
  });

  return (
    <Animated.View pointerEvents={open ? 'box-none' : 'none'} style={[styles.itemWrap, style]}>
      <View importantForAccessibility={open ? 'yes' : 'no-hide-descendants'} accessibilityElementsHidden={!open}>
        <GlassButton icon={Icon} onPress={onPress} size={ITEM} iconSize={21} active={active} label={section.label} />
      </View>
      <Glass style={styles.label} active={active} shadow={false} pointerEvents="none">
        <AppText variant="caption" color={active ? colors.onPrimary : colors.text} style={{ fontWeight: '700' }} numberOfLines={1}>
          {section.label}
        </AppText>
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', zIndex: 50 },
  center: { alignItems: 'center', justifyContent: 'center' },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  itemWrap: {
    position: 'absolute',
    left: (BUTTON - LABEL_W) / 2,
    top: (BUTTON - ITEM) / 2,
    width: LABEL_W,
    alignItems: 'center',
  },
  item: {
    width: ITEM,
    height: ITEM,
    borderRadius: ITEM / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  label: { marginTop: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, minWidth: 56, alignItems: 'center' },
});
