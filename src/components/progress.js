import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Progress ring that animates from its previous value to the new one,
 * so a fresh contribution visibly "flows" into the ring.
 */
export function ProgressRing({ size = 120, stroke = 10, progress = 0, color, trackColor, delay = 0, children, accessibilityLabel }) {
  const { colors, reduceMotion } = useTheme();
  const p = Math.max(0, Math.min(1, progress || 0));
  const value = useSharedValue(reduceMotion ? p : 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    value.value = reduceMotion
      ? p
      : withDelay(delay, withTiming(p, { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
  }, [p, reduceMotion, delay, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - value.value),
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor || colors.surfaceAlt} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color || colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

export function ProgressBar({ progress = 0, height = 8, color, trackColor, style, delay = 0 }) {
  const { colors, reduceMotion } = useTheme();
  const p = Math.max(0, Math.min(1, progress || 0));
  const value = useSharedValue(reduceMotion ? p : 0);
  useEffect(() => {
    value.value = reduceMotion
      ? p
      : withDelay(delay, withTiming(p, { duration: 800, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
  }, [p, reduceMotion, delay, value]);
  const fill = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: trackColor || colors.surfaceAlt, overflow: 'hidden' }, style]}
    >
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color || colors.primary }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
