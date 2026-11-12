/**
 * "Liquid glass" surfaces in the spirit of iOS: translucent body, bright rim,
 * specular highlight, soft refracted tint and a diffuse shadow. Drawn with SVG
 * so it renders identically on Android and iOS without a native blur.
 * Press feedback is a short, smooth "liquid" squish (no spring overshoot).
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

let gid = 0;

/**
 * Glass body that fills its parent. `active` tints it with the brand colour;
 * `tone="dark"` is for use on dark surfaces such as the Savings Dial.
 */
export function GlassLayer({ width, height, radius, active, tone, shadow = true }) {
  const { colors, isDark } = useTheme();
  const [id] = useState(() => `g${++gid}`);
  if (!width || !height) {
    return null;
  }
  const onDark = tone === 'dark' || isDark;
  const pad = shadow ? 10 : 0;
  const r = Math.min(radius, height / 2, width / 2);
  const tint = active ? colors.primary : onDark ? '#FFFFFF' : '#FFFFFF';
  const top = active ? 0.95 : onDark ? 0.2 : 0.92;
  const bottom = active ? 0.78 : onDark ? 0.06 : 0.55;
  return (
    <Svg
      pointerEvents="none"
      width={width + pad * 2}
      height={height + pad * 2}
      style={{ position: 'absolute', left: -pad, top: -pad }}
    >
      <Defs>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={tint} stopOpacity={top} />
          <Stop offset="1" stopColor={tint} stopOpacity={bottom} />
        </LinearGradient>
        <LinearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={onDark ? 0.55 : 1} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={onDark ? 0.12 : 0.35} />
          <Stop offset="1" stopColor={onDark ? '#FFFFFF' : '#0E2A20'} stopOpacity={onDark ? 0.25 : 0.1} />
        </LinearGradient>
        <RadialGradient id={`${id}s`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={active ? 0.55 : onDark ? 0.35 : 0.95} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}t`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={active ? '#FFFFFF' : colors.primary} stopOpacity={active ? 0.18 : onDark ? 0.22 : 0.14} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}d`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#000000" stopOpacity={onDark ? 0.45 : 0.16} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {shadow ? (
        <Ellipse cx={pad + width / 2} cy={pad + height * 0.62} rx={width * 0.62} ry={height * 0.55} fill={`url(#${id}d)`} />
      ) : null}
      <Rect x={pad} y={pad} width={width} height={height} rx={r} ry={r} fill={`url(#${id}b)`} />
      {/* refracted tint pooling at the bottom */}
      <Ellipse cx={pad + width / 2} cy={pad + height * 0.92} rx={width * 0.5} ry={height * 0.36} fill={`url(#${id}t)`} />
      {/* specular highlight */}
      <Ellipse cx={pad + width * 0.36} cy={pad + height * 0.2} rx={width * 0.34} ry={height * 0.2} fill={`url(#${id}s)`} />
      <Rect x={pad + 0.5} y={pad + 0.5} width={width - 1} height={height - 1} rx={r} ry={r} fill="none" stroke={`url(#${id}r)`} strokeWidth={1.1} />
    </Svg>
  );
}

/** A View with a glass background that sizes itself to its content. */
export function Glass({ style, radius = 999, active, tone, shadow, children, ...rest }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      {...rest}
      style={style}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== size.w || height !== size.h) {
          setSize({ w: width, h: height });
        }
      }}
    >
      <GlassLayer width={size.w} height={size.h} radius={radius} active={active} tone={tone} shadow={shadow} />
      {children}
    </View>
  );
}

/** Round (or pill) glass button with a smooth liquid squish on press. */
export function GlassButton({ icon: Icon, onPress, label, size = 44, iconSize = 20, active, tone, color, disabled, style, hitSlop = 6, children, width }) {
  const { colors, isDark, reduceMotion } = useTheme();
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const ease = { duration: 120, easing: Easing.out(Easing.quad) };
  const press = down => {
    if (reduceMotion) {
      return;
    }
    sx.value = withTiming(down ? 1.07 : 1, ease);
    sy.value = withTiming(down ? 0.93 : 1, ease);
  };
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: sx.value }, { scaleY: sy.value }] }));
  const onDark = tone === 'dark' || isDark;
  const fg = color || (active ? colors.onPrimary : onDark ? '#F3F7F3' : colors.text);
  const w = width || size;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press(true)}
      onPressOut={() => press(false)}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      style={[{ opacity: disabled ? 0.4 : 1 }, style]}
    >
      <Animated.View style={[styles.center, { width: w, height: size }, aStyle]}>
        <GlassLayer width={w} height={size} radius={size / 2} active={active} tone={tone} />
        {Icon ? <Icon size={iconSize} color={fg} strokeWidth={2} /> : null}
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 } });
