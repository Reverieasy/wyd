import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { firstFriendCelebration } from '@/src/features/onboarding/firstFriendCelebration';
import { useAppStore } from '@/src/state/appStore';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { useReducedMotion } from './MotionProvider';
import { AppText } from './primitives/AppText';

const emojis = ['🎉', '💜', '✨', '🫶'];
const holdMs = 3000;
const enterMs = 160;
const exitMs = 220;
const durationMs = enterMs + holdMs + exitMs;
const confetti = (['left', 'right'] as const).flatMap(side => Array.from({ length: 8 }, (_, index) => ({ side, index, emoji: emojis[index % emojis.length] })));
export function FirstFriendCelebration() {
  const { state } = useAppStore();
  const { styles } = useThemeStyles(makeStyles);
  const userId = state.server.profile?.id ?? null;
  const person = state.server.connections.find(entry => entry.connection.status === 'accepted')?.person;
  const hasFriend = Boolean(person);
  const name = person?.displayName ?? 'your friend';
  const account = useRef(userId); account.current = userId;
  const [celebration, setCelebration] = useState<{ userId: string; name: string } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (!userId || state.server.initializing) return;
    let active = true;
    void firstFriendCelebration.observe(userId, hasFriend).then(show => {
      if (active && show && account.current === userId) setCelebration({ userId, name });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [userId, hasFriend, name, state.server.initializing]);

  useEffect(() => {
    if (!celebration) return;
    progress.setValue(0);
    const animation = reduced ? null : Animated.timing(progress, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: true, isInteraction: false });
    animation?.start();
    const timer = setTimeout(() => setCelebration(null), reduced ? holdMs : durationMs);
    return () => { clearTimeout(timer); animation?.stop(); };
  }, [celebration, progress, reduced]);

  if (!celebration || celebration.userId !== userId) return null;
  return <View pointerEvents="none" style={styles.layer}>
    {!reduced ? <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.particles}>
      {confetti.map(({ side, index, emoji }) => {
        const delay = 0.005 + index * 0.018;
        const direction = side === 'left' ? 1 : -1;
        const distance = width * (0.28 + index % 4 * 0.1);
        const rise = height * (0.28 + index % 4 * 0.055);
        return <Animated.Text key={`${side}-${index}`} allowFontScaling={false} style={[styles.emoji, { [side]: -36, marginTop: index * 5, fontSize: 22 + index % 3 * 4,
          opacity: progress.interpolate({ inputRange: [0, delay + 0.005, delay + 0.045, delay + 0.48, delay + 0.62, 1], outputRange: [0, 0, 1, 1, 0, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, delay, delay + 0.24, delay + 0.62, 1], outputRange: [0, 0, direction * distance * 0.8, direction * distance, direction * distance] }) },
            { translateY: progress.interpolate({ inputRange: [0, delay, delay + 0.18, delay + 0.35, delay + 0.62, 1], outputRange: [0, 0, -rise * 0.8, -rise, -rise * 0.25, height * 0.2] }) },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${direction * (210 + index * 34)}deg`] }) },
            { scale: progress.interpolate({ inputRange: [0, delay + 0.06, delay + 0.62, 1], outputRange: [0.4, 1.1, 0.75, 0.75] }) },
          ],
        }]}>{emoji}</Animated.Text>;
      })}
    </View> : null}
    <Animated.View style={[styles.card, !reduced && {
      opacity: progress.interpolate({ inputRange: [0, enterMs / durationMs, (enterMs + holdMs) / durationMs, 1], outputRange: [0, 1, 1, 0] }),
      transform: [{ scale: progress.interpolate({ inputRange: [0, enterMs / durationMs, 1], outputRange: [0.94, 1, 1] }) }],
    }]}>
      <View accessible accessibilityRole="alert" accessibilityLabel={`Yey, you made your first friend! You and ${celebration.name} are connected.`} style={styles.copy}>
        <AppText style={styles.title}>Yey, you made your first friend! 🎉</AppText>
        <AppText tone="secondary" style={styles.subtitle}>You and {celebration.name} are connected.</AppText>
      </View>
    </Animated.View>
  </View>;
}
const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, zIndex: 100, elevation: 20 },
  particles: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  card: { width: '100%', maxWidth: 340, padding: 22, borderRadius: 24, backgroundColor: colors.background.card, zIndex: 1 },
  copy: { gap: 6, alignItems: 'center' },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, lineHeight: 30, textAlign: 'center' },
  subtitle: { textAlign: 'center' }, emoji: { position: 'absolute', top: '56%', width: 36, lineHeight: 40, textAlign: 'center' },
});
