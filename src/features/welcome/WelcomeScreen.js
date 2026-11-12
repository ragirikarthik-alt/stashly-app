/**
 * First screen for new users: what Stashly is, in one calm, animated view.
 * The logo floats on a breathing aurora, goal cards drift around it, and the
 * copy fades up line by line. "Get started" continues to onboarding.
 */
import React, { useEffect } from 'react';
import { Image, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Smartphone, Plane, Bike, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { AuroraBlobs, SAVE_BLOBS } from '../../components/saveAurora';
import { AppText } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';

const logo = require('../../assets/logo-mark.png');
const EASE = Easing.inOut(Easing.sin);

function useLoop(duration, delay = 0, enabled = true) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    v.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration, easing: EASE }), withTiming(0, { duration, easing: EASE })), -1, false),
    );
  }, [duration, delay, enabled, v]);
  return v;
}

/** A small glass goal card that drifts gently. */
function FloatingCard({ icon: Icon, label, pct, style, delay, enabled, tilt }) {
  const t = useLoop(2600, delay, enabled);
  const a = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * t.value }, { rotate: `${tilt + 2 * t.value}deg` }],
  }));
  return (
    <Animated.View entering={enabled ? FadeIn.delay(400 + delay).duration(700) : undefined} style={[styles.float, style, a]}>
      <View style={styles.floatIcon}>
        <Icon size={16} color="#E8FFF4" />
      </View>
      <AppText variant="caption" color="#E8FFF4" style={{ fontWeight: '700', marginTop: 8 }}>
        {label}
      </AppText>
      <View style={styles.floatTrack}>
        <View style={[styles.floatFill, { width: `${pct}%` }]} />
      </View>
    </Animated.View>
  );
}

export function WelcomeScreen({ navigation }) {
  const { reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const animate = !reduceMotion;

  const breathe = useLoop(3200, 0, animate);
  const bob = useLoop(2200, 300, animate);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + 0.25 * breathe.value,
    transform: [{ scale: 1 + 0.08 * breathe.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * bob.value }] }));

  const intro = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    intro.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [intro]);
  const introStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ scale: 0.85 + 0.15 * intro.value }],
  }));

  const enter = i => (animate ? FadeInDown.delay(500 + i * 120).duration(600).easing(Easing.out(Easing.cubic)) : undefined);
  const heroH = Math.min(H * 0.48, 420);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      {/* hero */}
      <View style={{ height: heroH + insets.top, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[styles.glow, { width: W * 1.4, height: W * 1.2, top: insets.top + heroH * 0.5 - W * 0.6 }, glowStyle]} pointerEvents="none">
          <AuroraBlobs w={W * 1.4} h={W * 1.2} blobs={SAVE_BLOBS.map(b => ({ ...b, o: b.o * 0.55 }))} />
        </Animated.View>

        <FloatingCard icon={Smartphone} label="New phone" pct={62} delay={0} enabled={animate} tilt={-8} style={{ left: 22, top: insets.top + heroH * 0.16 }} />
        <FloatingCard icon={Plane} label="Goa trip" pct={34} delay={500} enabled={animate} tilt={7} style={{ right: 20, top: insets.top + heroH * 0.1 }} />
        <FloatingCard icon={Bike} label="Road bike" pct={81} delay={900} enabled={animate} tilt={5} style={{ right: 34, top: insets.top + heroH * 0.62 }} />

        <Animated.View style={introStyle}>
          <Animated.View style={logoStyle}>
            <Image source={logo} style={{ width: heroH * 0.34, height: heroH * 0.42 }} resizeMode="contain" accessibilityLabel="Stashly" />
          </Animated.View>
        </Animated.View>
      </View>

      {/* copy */}
      <View style={[styles.copy, { paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={enter(0)}>
          <Text style={styles.title} accessibilityRole="header">
            Stashly
          </Text>
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <Text style={styles.tagline}>
            Save with intention.{'\n'}
            <Text style={{ color: '#6EE7B0' }}>Buy with confidence.</Text>
          </Text>
        </Animated.View>
        <Animated.View entering={enter(2)}>
          <AppText variant="body" color="#B9D3C7" style={{ marginTop: 14, lineHeight: 23 }}>
            Pick the things you want, set a target, and record money as you put it aside. Stashly turns every small amount into
            visible progress — so you buy when you’re ready, not on credit.
          </AppText>
        </Animated.View>
        <Animated.View entering={enter(3)} style={styles.trust}>
          <ShieldCheck size={15} color="#6EE7B0" />
          <AppText variant="caption" color="#9FC3B2" style={{ flex: 1 }}>
            Private and offline. Your data never leaves this phone, and Stashly never touches real money.
          </AppText>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View entering={animate ? FadeIn.delay(1100).duration(500) : undefined}>
          <Pressable
            onPress={() => navigation.navigate('Onboarding')}
            accessibilityRole="button"
            accessibilityLabel="Get started"
            style={({ pressed }) => [styles.cta, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <AppText variant="bodyStrong" color="#08261B">
              Get started
            </AppText>
            <ArrowRight size={20} color="#08261B" strokeWidth={2.4} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A231B' },
  glow: { position: 'absolute' },
  float: {
    position: 'absolute',
    width: 112,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(22, 74, 55, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(185, 245, 218, 0.28)',
  },
  floatIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  floatTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 8, overflow: 'hidden' },
  floatFill: { height: 6, borderRadius: 3, backgroundColor: '#6EE7B0' },
  copy: { flex: 1, paddingHorizontal: 26 },
  title: { color: '#F3F7F3', fontSize: 48, lineHeight: 54, fontWeight: '800', letterSpacing: -1.5 },
  tagline: { color: '#F3F7F3', fontSize: 24, lineHeight: 30, fontWeight: '600', marginTop: 4, letterSpacing: -0.3 },
  trust: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 16 },
  cta: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#6EE7B0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
