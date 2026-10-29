import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAppStore } from '@/src/state/appStore';
import { firstUseStep, type FirstUseProgress } from '@/src/features/onboarding/firstUseProgress';
import { firstUseStorage } from '@/src/features/onboarding/firstUseStorage';
import { widgetService } from '@/src/features/widgets/widgetService';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { ActionButton } from './ActionButton';
import { AppText } from './primitives/AppText';

export function FirstStepsCard({ standalone = false }: { standalone?: boolean }) {
  const { state } = useAppStore();
  const { colors, styles } = useThemeStyles(makeStyles);
  const userId = state.server.profile?.id ?? null;
  const connected = state.server.connections.some(entry => entry.connection.status === 'accepted');
  const firstMoment = state.server.updates.length > 0 || Boolean(state.server.lastSentUpdateId);
  const [saved, setSaved] = useState<{ userId: string; progress: FirstUseProgress } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const account = useRef(userId); account.current = userId;
  const sequence = useRef(0);
  const refresh = useCallback(() => {
    if (!userId || state.server.initializing) return;
    const request = ++sequence.current;
    void (async () => {
      const widgetAdded = await widgetService.hasPlacedWidget(userId).catch(() => false);
      const progress = await firstUseStorage.record(userId, { connected, firstMoment, widgetAdded });
      if (account.current === userId && request === sequence.current) { setSaved({ userId, progress }); setError(null); }
    })().catch(() => { if (account.current === userId && request === sequence.current) setError('Your getting-started progress could not be loaded. Try again.'); });
  }, [userId, connected, firstMoment, state.server.initializing]);
  useFocusEffect(useCallback(() => { refresh(); return () => { sequence.current++; }; }, [refresh]));
  useEffect(() => {
    const listener = AppState.addEventListener('change', value => { if (value === 'active') refresh(); });
    return () => listener.remove();
  }, [refresh]);
  const progress = saved?.userId === userId ? saved.progress : null;
  const step = progress ? firstUseStep(progress) : null;
  const dismiss = async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const next = await firstUseStorage.record(userId, { dismissed: true });
      if (account.current === userId) { setSaved({ userId, progress: next }); if (standalone) router.replace('/(tabs)/people'); }
    } catch { if (account.current === userId) setError('Could not save your progress. Try again.'); }
    finally { setBusy(false); }
  };
  if (!standalone && (!progress || progress.dismissed || step === 'done')) return null;
  if (!progress || !step) return <View style={styles.card}><AppText tone="secondary">{error ?? 'Getting your first steps ready…'}</AppText>{error ? <ActionButton label="Try again" variant="secondary" onPress={refresh} /> : null}</View>;
  if (step === 'done') return <View style={styles.card}><AppText variant="title20">You’re all set.</AppText><AppText tone="secondary">Keep sharing the little things. Your last 30 days together live in Moments.</AppText><ActionButton label="Send a moment" emphasis="gradient" onPress={() => router.push('/(tabs)/camera')} /></View>;
  const index = step === 'connect' ? 0 : step === 'moment' ? 1 : 2;
  const title = step === 'connect' ? 'Find one person.' : step === 'moment' ? 'Share your first moment.' : 'Keep them a glance away.';
  const message = step === 'connect' ? 'Start with someone you know. Search their username or share your invite code.' : step === 'moment' ? 'Send a photo of what you’re doing, or receive one from your person. No caption or status needed.' : Platform.OS === 'android' ? 'Choose your person and add their latest photo to your home screen.' : 'Android widgets bring your person’s latest photo to the home screen. You can explore them now or finish later.';
  const label = step === 'connect' || (step === 'moment' && !connected) ? 'Find your person' : step === 'moment' ? 'Send first moment' : Platform.OS === 'android' ? 'Add your widget' : 'Explore Android widgets';
  const open = () => router.push(step === 'connect' || (step === 'moment' && !connected) ? '/(onboarding)/connect' : step === 'moment' ? '/(tabs)/camera' : '/(flows)/widget');
  return <View style={styles.card}>
    <AppText variant="caption11" tone="secondary">GET STARTED · {index + 1} OF 3</AppText>
    <View accessible accessibilityLabel={`Step ${index + 1} of 3`} style={styles.progress}>{[0, 1, 2].map(value => <View key={value} style={[styles.segment, { backgroundColor: value <= index ? colors.background.accent : colors.border.default }]} />)}</View>
    <AppText variant="title20">{title}</AppText><AppText variant="body14" tone="secondary">{message}</AppText>
    <ActionButton label={label} emphasis="gradient" onPress={open} />
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void dismiss()} style={styles.later}><AppText tone="secondary">{busy ? 'Saving…' : 'Maybe later'}</AppText></Pressable>
    {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
  </View>;
}
const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  card: { padding: 18, gap: 10, marginBottom: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card },
  progress: { flexDirection: 'row', gap: 5, marginBottom: 3 }, segment: { flex: 1, height: 3, borderRadius: 2 }, later: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
