import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Keyboard, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './ui';

/**
 * Bottom sheet with animated backdrop, slide-in, drag-to-dismiss on the handle,
 * hardware back support and tap-outside to close.
 */
export function BottomSheet({ visible, onClose, title, children, dark, maxHeightRatio = 0.9, footer }) {
  const { colors, radius, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  // Modals are edge-to-edge, so the window doesn't resize for the keyboard: lift the sheet ourselves.
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    if (!mounted) {
      return;
    }
    const show = Keyboard.addListener('keyboardDidShow', e => setKeyboard(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [mounted]);
  const y = useSharedValue(winH);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    if (visible) {
      backdrop.value = withTiming(1, { duration: reduceMotion ? 0 : 220 });
      y.value = reduceMotion ? 0 : withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else {
      backdrop.value = withTiming(0, { duration: reduceMotion ? 0 : 180 });
      y.value = withTiming(winH, { duration: reduceMotion ? 0 : 220, easing: Easing.in(Easing.quad) }, done => {
        if (done) {
          scheduleOnRN(setMounted, false);
        }
      });
    }
  }, [visible, mounted, reduceMotion, winH, y, backdrop]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const close = useCallback(() => onClose?.(), [onClose]);

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate(e => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd(e => {
      if (e.translationY > 110 || e.velocityY > 900) {
        scheduleOnRN(close);
      } else {
        y.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) {
    return null;
  }
  const bg = dark ? '#0E2A20' : colors.surface;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <View style={styles.anchor} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: bg,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                maxHeight: (winH - keyboard) * maxHeightRatio,
                marginBottom: keyboard,
                paddingBottom: keyboard ? 16 : Math.max(insets.bottom, 16),
              },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={drag}>
              <View style={styles.handleArea}>
                <View style={[styles.handle, { backgroundColor: dark ? 'rgba(255,255,255,0.25)' : colors.borderStrong }]} />
                {title ? (
                  <AppText variant="h3" color={dark ? '#F3F7F3' : colors.text} style={styles.title} accessibilityRole="header">
                    {title}
                  </AppText>
                ) : null}
              </View>
            </GestureDetector>
            <View style={styles.content}>{children}</View>
            {footer}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%' },
  handleArea: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3 },
  title: { marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingTop: 8, flexShrink: 1 },
});
