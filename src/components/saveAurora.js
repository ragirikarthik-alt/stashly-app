/**
 * Save confirmation animation for the Savings Dial.
 *
 *   saving → the dial dims, a soft aurora glow rises from the bottom and
 *            "breathes" while the entry is written ("Saving to …").
 *   done   → the glow swells into a bright flash, sweeps up off the screen
 *            and leaves a calm "✓ Saved" message.
 *   error  → the glow sinks away and the dial comes back untouched.
 *
 * Eased timing only (no springs); reduced motion skips the glow entirely.
 */
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { AppText } from './ui';

const OUT = Easing.out(Easing.cubic);
const INOUT = Easing.inOut(Easing.cubic);

/** Brand aurora: emerald, mint, teal and a warm gold, with a bright core. */
export const SAVE_BLOBS = [
  { cx: 0.28, cy: 0.62, rx: 0.42, ry: 0.36, color: '#10B981', o: 0.95 },
  { cx: 0.74, cy: 0.56, rx: 0.4, ry: 0.34, color: '#F2C14E', o: 0.85 },
  { cx: 0.5, cy: 0.74, rx: 0.5, ry: 0.32, color: '#2DD4BF', o: 0.8 },
  { cx: 0.52, cy: 0.62, rx: 0.3, ry: 0.24, color: '#ECFDF5', o: 0.95 },
];
const WITHDRAW_BLOBS = [
  { cx: 0.28, cy: 0.62, rx: 0.42, ry: 0.36, color: '#F59E0B', o: 0.9 },
  { cx: 0.74, cy: 0.56, rx: 0.4, ry: 0.34, color: '#F472B6', o: 0.7 },
  { cx: 0.5, cy: 0.74, rx: 0.5, ry: 0.32, color: '#FB923C', o: 0.8 },
  { cx: 0.52, cy: 0.62, rx: 0.3, ry: 0.24, color: '#FFF7ED', o: 0.95 },
];

export function AuroraBlobs({ w, h, blobs }) {
  return (
    <Svg width={w} height={h}>
      <Defs>
        {blobs.map((b, i) => (
          <RadialGradient key={i} id={`au${i}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={b.color} stopOpacity={b.o} />
            <Stop offset="0.55" stopColor={b.color} stopOpacity={b.o * 0.45} />
            <Stop offset="1" stopColor={b.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {blobs.map((b, i) => (
        <Ellipse key={i} cx={b.cx * w} cy={b.cy * h} rx={b.rx * w} ry={b.ry * h} fill={`url(#au${i})`} />
      ))}
    </Svg>
  );
}

export function SaveAurora({ phase, isW, reduceMotion, title, subtitle, savingLabel }) {
  const { width: W, height: H } = useWindowDimensions();
  const rise = useSharedValue(1); // 1 = below screen, 0 = resting at bottom, negative = swept up
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const flash = useSharedValue(0);
  const drift = useSharedValue(0);
  const status = useSharedValue(0);
  const result = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      status.value = phase === 'saving' ? 1 : 0;
      result.value = phase === 'saved' ? 1 : 0;
      return;
    }
    if (phase === 'saving') {
      rise.value = withTiming(0, { duration: 650, easing: OUT });
      glow.value = withTiming(1, { duration: 500, easing: OUT });
      status.value = withDelay(200, withTiming(1, { duration: 300 }));
      // gentle breathing while the entry is written
      scale.value = withRepeat(withSequence(withTiming(1.08, { duration: 900, easing: INOUT }), withTiming(1, { duration: 900, easing: INOUT })), -1, false);
      drift.value = withRepeat(withSequence(withTiming(1, { duration: 1600, easing: INOUT }), withTiming(-1, { duration: 1600, easing: INOUT })), -1, true);
    } else if (phase === 'saved') {
      cancelAnimation(scale);
      status.value = withTiming(0, { duration: 180 });
      // swell into a flash …
      scale.value = withTiming(2.6, { duration: 520, easing: INOUT });
      rise.value = withSequence(
        withTiming(-0.35, { duration: 520, easing: INOUT }),
        // … then sweep up and away
        withTiming(-1.4, { duration: 520, easing: Easing.in(Easing.cubic) }),
      );
      flash.value = withSequence(withDelay(300, withTiming(0.85, { duration: 260 })), withTiming(0, { duration: 520, easing: OUT }));
      glow.value = withDelay(650, withTiming(0, { duration: 450 }));
      result.value = withDelay(820, withTiming(1, { duration: 360, easing: OUT }));
    } else {
      cancelAnimation(scale);
      cancelAnimation(drift);
      rise.value = withTiming(1, { duration: 450, easing: Easing.in(Easing.cubic) });
      glow.value = withTiming(0, { duration: 400 });
      status.value = withTiming(0, { duration: 200 });
      result.value = 0;
      flash.value = 0;
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [phase, reduceMotion, rise, scale, glow, flash, drift, status, result]);

  const blobW = W * 1.5;
  const blobH = W * 1.25;
  const auroraStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [
      { translateY: rise.value * blobH * 0.9 },
      { translateX: drift.value * W * 0.04 },
      { scale: scale.value },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const statusStyle = useAnimatedStyle(() => ({ opacity: status.value }));
  const resultStyle = useAnimatedStyle(() => ({
    opacity: result.value,
    transform: [{ translateY: (1 - result.value) * 12 }],
  }));

  if (phase !== 'saving' && phase !== 'saved') {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto" accessibilityViewIsModal>
      {!reduceMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width: blobW, height: blobH, left: (W - blobW) / 2, bottom: -blobH * 0.42 }, auroraStyle]}
        >
          <AuroraBlobs w={blobW} h={blobH} blobs={isW ? WITHDRAW_BLOBS : SAVE_BLOBS} />
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isW ? '#FFF4E6' : '#EFFFF7' }, flashStyle]} />

      <Animated.View style={[styles.center, { top: H * 0.42 }, statusStyle]} accessibilityLiveRegion="polite">
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color="#F3F7F3" />
          <AppText variant="smallStrong" color="#F3F7F3">
            {savingLabel}
          </AppText>
        </View>
      </Animated.View>

      <Animated.View style={[styles.center, { top: H * 0.4 }, resultStyle]} accessibilityLiveRegion="polite">
        <View style={[styles.check, { backgroundColor: isW ? '#F5B98A' : '#6EE7B0' }]}>
          <Check size={22} color="#08261B" strokeWidth={3} />
        </View>
        <AppText variant="h2" color="#F3F7F3" center style={{ marginTop: 14 }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color="#9FC3B2" center style={{ marginTop: 4 }} numeric>
            {subtitle}
          </AppText>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
