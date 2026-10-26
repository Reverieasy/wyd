import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Animated, AppState, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { Avatar } from './Avatar';
import { AppText } from './primitives/AppText';
import { useReducedMotion } from './SoftEntrance';

export const NUDGE_HOLD_MS = 3000;
type Props = Pick<ComponentProps<typeof Avatar>, 'name' | 'uri' | 'size' | 'palette' | 'selected'> & {
  disabled?: boolean;
  busy?: boolean;
  onPress?: () => void;
  onNudge: () => Promise<boolean>;
  variant?: 'default' | 'home' | 'compact';
};

// Two clipped semicircles reveal a continuous ring clockwise, using only native transforms.
function HoldRing({ progress, size, color, track }: { progress: Animated.Value; size: number; color: string; track: string }) {
  const half = size / 2;
  const right = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-180deg', '0deg', '0deg'], extrapolate: 'clamp' });
  const left = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '0deg', '180deg'], extrapolate: 'clamp' });
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: half }]}>
    <View style={[StyleSheet.absoluteFill, { borderRadius: half, borderWidth: 3, borderColor: track }]} />
    {[{ left: half, offset: -half, rotate: right }, { left: 0, offset: 0, rotate: left }].map((part, index) => (
      <View key={index} style={{ position: 'absolute', top: 0, left: part.left, width: half, height: size, overflow: 'hidden' }}>
        <Animated.View style={{ position: 'absolute', left: part.offset, width: size, height: size, transform: [{ rotate: part.rotate }] }}>
          <View style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: -half, width: size, height: size, borderRadius: half, borderWidth: 3, borderColor: color }} />
          </View>
        </Animated.View>
      </View>
    ))}
  </View>;
}

export function NudgeAvatar({ name, uri, size = 48, palette, selected, disabled = false, busy = false, onPress, onNudge, variant = 'default' }: Props) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const progress = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const completed = useRef(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const latest = useRef({ disabled, busy, onNudge });
  latest.current = { disabled, busy, onNudge };
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const cancel = useCallback(() => {
    held.current = false;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    progress.stopAnimation();
    if (!pending.current) progress.setValue(0);
    lift.stopAnimation();
    if (!mounted.current || reducedMotion) lift.setValue(0);
    else Animated.timing(lift, { toValue: 0, duration: 160, useNativeDriver: true, isInteraction: false }).start();
    if (mounted.current) setHolding(false);
  }, [lift, progress, reducedMotion]);

  useFocusEffect(useCallback(() => cancel, [cancel]));
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', value => { if (value !== 'active') cancel(); });
    return () => { mounted.current = false; cancel(); subscription.remove(); };
  }, [cancel]);
  useEffect(() => { if (disabled || (busy && !pending.current)) cancel(); }, [disabled, busy, cancel]);

  const start = () => {
    if (latest.current.disabled || latest.current.busy || pending.current || held.current) return;
    held.current = true; completed.current = false;
    setSent(false); setFailed(false); setHolding(true);
    lift.stopAnimation();
    if (!reducedMotion) Animated.timing(lift, { toValue: 1, duration: 160, useNativeDriver: true, isInteraction: false }).start();
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: NUDGE_HOLD_MS, easing: Easing.linear, useNativeDriver: true, isInteraction: false }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!held.current || !mounted.current || latest.current.disabled || latest.current.busy || pending.current) return;
      completed.current = true; held.current = false; pending.current = true;
      setHolding(false); setSending(true); progress.stopAnimation(); progress.setValue(1);
      void (async () => {
        try {
          const success = await latest.current.onNudge();
          if (mounted.current) { setSent(success); setFailed(!success); }
        } catch { if (mounted.current) setFailed(true); }
        finally {
          pending.current = false;
          if (mounted.current) { setSending(false); progress.setValue(0); }
        }
      })();
    }, NUDGE_HOLD_MS);
  };

  const ringSize = size + 10;
  return <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityHint="Tap to view. Hold for 3 seconds to send a nudge; release early to cancel."
    accessibilityState={{ selected: Boolean(selected), disabled: disabled || busy || sending, busy: busy || sending }}
    disabled={disabled || busy || sending} onPressIn={start} onPressOut={cancel} onBlur={cancel}
    delayLongPress={NUDGE_HOLD_MS} onLongPress={() => {}}
    onPress={() => { if (!completed.current && !pending.current) onPress?.(); }}
    style={[styles.button, variant === 'home' && styles.homeButton, variant === 'compact' && { minWidth: ringSize, maxWidth: ringSize, gap: 0 }]} pressRetentionOffset={0}>
    <View style={{ width: ringSize, height: ringSize + (variant === 'compact' ? 0 : variant === 'home' ? 6 : 18), alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center', transform: [
        { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, variant === 'home' ? -4 : -10] }) },
        { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, variant === 'home' ? 1.18 : 1.22] }) },
      ] }}>
      {variant === 'home' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.homeRing]} /> : null}
      <View pointerEvents="none"><Avatar name={name} uri={uri} size={size} palette={palette} selected={selected} /></View>
      {holding || sending || busy ? <HoldRing progress={progress} size={ringSize} color={colors.background.accent} track={colors.border.default} /> : null}
      {sending || busy ? <View pointerEvents="none" style={[styles.badge, { backgroundColor: colors.background.card }]}><ActivityIndicator size="small" color={colors.background.accent} /></View> : sent ? <View pointerEvents="none" style={styles.badge}><AppText style={styles.check}>✓</AppText></View> : null}
      </Animated.View>
    </View>
    {variant !== 'compact' ? <><AppText numberOfLines={1} style={[styles.name, variant === 'home' && styles.homeName]}>{name}</AppText>
    <AppText accessibilityLiveRegion="polite" style={[styles.hint, variant === 'home' && styles.homeHint]}>{sending || busy ? 'Sending…' : sent ? 'Nudged!' : holding ? 'Keep holding' : failed ? 'Try again' : 'Hold to nudge'}</AppText></> : null}
  </Pressable>;
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  button: { alignItems: 'center', gap: 4, minWidth: 68, maxWidth: 90, userSelect: 'none' },
  name: { fontSize: 10, color: colors.text.primary, maxWidth: 90 },
  hint: { fontSize: 10, lineHeight: 14, color: colors.text.secondary },
  badge: { position: 'absolute', bottom: 0, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#6C2CF5', alignItems: 'center', justifyContent: 'center' },
  check: { color: 'white', fontSize: 14 },
  homeButton: { width: 84, maxWidth: 96, gap: 3 }, homeRing: { borderRadius: 100, borderWidth: 1.5, borderColor: colors.background.accentSoft },
  homeName: { fontSize: 12, lineHeight: 18 }, homeHint: { fontSize: 10, lineHeight: 14 },
});
