import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hideAsync } from 'expo-splash-screen';
import { BrandLogo } from './BrandLogo';
import { BrandWordmark } from './BrandWordmark';
import { useReducedMotion } from './MotionProvider';

export function BootPlaceholder() {
  return <View accessibilityLabel="Opening watchudoin?" style={styles.screen}><BrandLogo size={220} /></View>;
}

// Mounted once at launch. No navigation transitions or recurring animation.
export function StartupSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const nativeHidden = useRef(false), finished = useRef(false);
  const callback = useRef(onFinish); callback.current = onFinish;
  const [laidOut, setLaidOut] = useState(false), [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (!laidOut) return;
    let active = true;
    if (reducedMotion) { scale.setValue(1); setIntroDone(true); return; }
    const animation = Animated.sequence([
      Animated.timing(scale, { toValue: 1.055, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }),
      Animated.timing(scale, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
    ]);
    animation.start(result => { if (active && result.finished) setIntroDone(true); });
    return () => { active = false; animation.stop(); };
  }, [laidOut, reducedMotion, scale]);

  useEffect(() => {
    if (!ready || !laidOut || !introDone || finished.current) return;
    let active = true;
    const complete = () => { if (active && !finished.current) { finished.current = true; callback.current(); } };
    if (reducedMotion) { complete(); return; }
    const animation = Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true, isInteraction: false });
    animation.start(result => { if (result.finished) complete(); });
    return () => { active = false; animation.stop(); };
  }, [ready, laidOut, introDone, reducedMotion, opacity]);

  return <Animated.View accessibilityLabel="Opening watchudoin?" accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.screen, { opacity, paddingTop: insets.top, paddingBottom: insets.bottom }]} onLayout={() => {
    setLaidOut(true);
    if (!nativeHidden.current) { nativeHidden.current = true; void hideAsync().catch(() => undefined); }
  }}>
    <View style={styles.content}>
      <Animated.View style={{ transform: [{ scale }] }}><BrandLogo size={220} /></Animated.View>
      <View style={styles.wordmark}><BrandWordmark size={29} appearance="dark" /><Text style={styles.tagline}>Little moments. Your people.</Text></View>
      <View accessibilityLiveRegion="polite" style={styles.progress}>
        {!ready ? <><ActivityIndicator color="#B394FF" size="small" /><Text style={styles.loading}>Getting your circle ready…</Text></> : null}
      </View>
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141119', zIndex: 2000 },
  content: { width: '100%', maxWidth: 360, paddingHorizontal: 24, alignItems: 'center', gap: 20 },
  wordmark: { alignItems: 'center', gap: 8 },
  tagline: { color: '#B5A9C0', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  progress: { minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loading: { color: '#B5A9C0', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
