import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ForegroundActivityTracker } from '@/src/features/notifications/foregroundActivity';
import { notificationService } from '@/src/features/notifications/notificationService';
import { useAppStore } from '@/src/state/appStore';
import type { ActivityItem } from '@/src/models';
import { reactionEmoji } from '@/src/models';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { AppText } from './primitives/AppText';
import { Avatar } from './Avatar';
import { SoftEntrance } from './SoftEntrance';

export function ForegroundNotificationBanner() {
  const { state } = useAppStore();
  const { colors, styles } = useThemeStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const tracker = useRef(new ForegroundActivityTracker()).current;
  const [queue, setQueue] = useState<ActivityItem[]>([]);
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const userId = state.server.session?.user.id ?? null;
  const previousUser = useRef(userId);
  const systemBanner = state.server.notificationPermission === 'granted' && notificationService.usesSystemBanners();
  const preferences = state.server.notificationPreferences;

  useEffect(() => {
    const listener = AppState.addEventListener('change', value => { setActive(value === 'active'); if (value !== 'active') setQueue([]); });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (previousUser.current !== userId) { previousUser.current = userId; setQueue([]); }
    const fresh = tracker.read(userId, state.server.activityHydrated, state.server.activity, preferences, active);
    if (!active || systemBanner || !preferences.enabled) { setQueue([]); return; }
    setQueue(current => {
      const allowed = current.filter(item => item.kind === 'moment' ? preferences.moments : preferences.reactions);
      if (!fresh.length && allowed.length === current.length) return current;
      return [...allowed, ...fresh].slice(-4);
    });
  }, [tracker, userId, state.server.activityHydrated, state.server.activity, preferences, active, systemBanner]);

  const item = queue[0];
  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => setQueue(current => current.slice(1)), 5000);
    return () => clearTimeout(timer);
  }, [item]);

  if (!item || !userId || previousUser.current !== userId || !active || !preferences.enabled || systemBanner || state.server.notificationPromptVisible) return null;
  const dismiss = () => setQueue(current => current.slice(1));
  const open = () => { dismiss(); router.push({ pathname: '/(flows)/moment/[id]', params: { id: item.updateId! } }); };
  const message = item.kind === 'moment' ? 'Sent you a photo moment' : `Reacted ${item.reaction ? reactionEmoji[item.reaction] : '❤️'} to your moment`;
  return <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 12 }]}>
    <SoftEntrance key={`${item.id}:${item.createdAt}`} style={styles.banner}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.actor.displayName}: ${message}. Open moment.`} onPress={open} style={styles.body}>
        <Avatar name={item.actor.displayName} uri={item.actor.avatarUrl ?? undefined} size={40} />
        <View style={styles.copy} accessibilityLiveRegion="polite"><AppText variant="label14" numberOfLines={1}>{item.actor.displayName}</AppText><AppText variant="caption11" tone="secondary" numberOfLines={2}>{message}</AppText></View>
        {item.kind === 'moment' ? <MaterialIcons name="photo-camera" size={22} color={colors.background.accent} /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={dismiss} style={styles.close}><MaterialIcons name="close" size={18} color={colors.text.secondary} /></Pressable>
    </SoftEntrance>
  </View>;
}
const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  overlay: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000, elevation: 20 },
  banner: { width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 10 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingRight: 0, minHeight: 72 },
  copy: { flex: 1, gap: 4 }, close: { width: 44, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
});
