import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SectionContext } from './sectionContext';
import { BackHandler, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useFocusEffect } from '@react-navigation/native';
import { House, Target, CalendarDays, ChartColumn, Settings2 } from 'lucide-react-native';
import { NavigationCompass } from './Compass';
import { useTheme } from '../theme/ThemeProvider';
import { HomeScreen } from '../features/home/HomeScreen';
import { GoalsScreen } from '../features/goals/GoalsScreen';
import { CalendarScreen } from '../features/calendar/CalendarScreen';
import { InsightsScreen } from '../features/insights/InsightsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';

export const SECTIONS = [
  { key: 'home', label: 'Home', icon: House, component: HomeScreen },
  { key: 'goals', label: 'Goals', icon: Target, component: GoalsScreen },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays, component: CalendarScreen },
  { key: 'insights', label: 'Insights', icon: ChartColumn, component: InsightsScreen },
  { key: 'settings', label: 'Settings', icon: Settings2, component: SettingsScreen },
];

export function MainScreen({ route }) {
  const { colors, reduceMotion } = useTheme();
  const pager = useRef(null);
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState(() => new Set([0]));
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const [sectionParams, setSectionParams] = useState({});

  // Where the native pager actually is, and where we last asked it to go.
  const position = useRef(0);
  const target = useRef(0);
  const userSwiping = useRef(false);
  const verifyTimer = useRef(null);

  /**
   * Section switching must never be lost. A single setPage command can be
   * dropped by the native pager if it arrives mid-scroll or during layout, so
   * we send it on the next frame and then verify: once the pager is idle (or
   * after a timeout) we finish the jump if it didn't land.
   */
  const ensureTarget = useCallback(() => {
    if (position.current !== target.current) {
      pager.current?.setPageWithoutAnimation(target.current);
      position.current = target.current;
    }
  }, []);

  const goTo = useCallback(
    (i, params) => {
      if (params) {
        setSectionParams(p => ({ ...p, [i]: { ...params, _t: Date.now() } }));
      }
      target.current = i;
      setIndex(i);
      setVisited(v => (v.has(i) ? v : new Set(v).add(i)));
      requestAnimationFrame(() => {
        if (reduceMotion || Math.abs(position.current - i) > 2) {
          // long jumps would flash through every section; go there directly
          pager.current?.setPageWithoutAnimation(i);
        } else {
          pager.current?.setPage(i);
        }
      });
      clearTimeout(verifyTimer.current);
      verifyTimer.current = setTimeout(ensureTarget, 700);
    },
    [reduceMotion, ensureTarget],
  );

  useEffect(() => () => clearTimeout(verifyTimer.current), []);

  // Allow other screens to deep-link into a section: navigate('Main', { section: 2 })
  useEffect(() => {
    if (route.params?.section != null) {
      goTo(route.params.section, route.params.sectionParams);
    }
  }, [route.params, goTo]);

  // Android back on a non-Home section returns to Home before leaving the app.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (index !== 0) {
          goTo(0);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [index, goTo]),
  );

  const ctx = useMemo(
    () => ({ index, goTo, setSwipeEnabled, sections: SECTIONS, params: sectionParams }),
    [index, goTo, sectionParams],
  );

  return (
    <SectionContext.Provider value={ctx}>
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <PagerView
          ref={pager}
          style={styles.flex}
          initialPage={0}
          scrollEnabled={swipeEnabled}
          overdrag={false}
          offscreenPageLimit={1}
          onPageSelected={e => {
            const i = e.nativeEvent.position;
            position.current = i;
            if (userSwiping.current) {
              // a user swipe wins over any pending programmatic jump
              target.current = i;
              clearTimeout(verifyTimer.current);
            }
            setIndex(target.current);
            setVisited(v => (v.has(i) ? v : new Set(v).add(i)));
          }}
          onPageScrollStateChanged={e => {
            const state = e.nativeEvent.pageScrollState;
            if (state === 'dragging') {
              userSwiping.current = true;
            } else if (state === 'idle') {
              userSwiping.current = false;
              ensureTarget();
            }
          }}
        >
          {SECTIONS.map((s, i) => {
            const Comp = s.component;
            return (
              <View key={s.key} style={styles.flex} collapsable={false}>
                {visited.has(i) || Math.abs(i - index) <= 1 ? <Comp active={index === i} params={sectionParams[i]} /> : null}
              </View>
            );
          })}
        </PagerView>
        <NavigationCompass sections={SECTIONS} index={index} onSelect={goTo} />
      </View>
    </SectionContext.Provider>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
