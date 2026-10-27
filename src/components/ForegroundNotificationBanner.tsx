import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ForegroundActivityTracker } from '@/src/features/notifications/foregroundActivity';
import { useAppStore } from '@/src/state/appStore';
import type { ActivityItem } from '@/src/models';
import { reactionEmoji } from '@/src/models';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { AppText } from './primitives/AppText';
import { Avatar } from './Avatar';
import { SoftEntrance } from './SoftEntrance';
import { BrandLogo } from './BrandLogo';

export function ForegroundNotificationBanner() {
  const { state } = useAppStore();
  const { styles } = useThemeStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const tracker = useRef(new ForegroundActivityTracker()).current;
  const [queue, setQueue] = useState<ActivityItem[]>([]);
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const userId = state.server.session?.user.id ?? null;
  const previousUser = useRef(userId);
  const preferences = state.server.notificationPreferences;

  useEffect(() => {
    const listener = AppState.addEventListener('change', value => { setActive(value === 'active'); if (value !== 'active') setQueue([]); });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (previousUser.current !== userId) { previousUser.current = userId; setQueue([]); }
    const fresh = tracker.read(userId, state.server.activityHydrated, state.server.activity, preferences, active);
    if (!active || !preferences.enabled) { setQueue([]); return; }
    setQueue(current => {
      const allowed = current.filter(item => item.kind === 'moment' ? preferences.moments : item.kind === 'comment' ? preferences.comments : preferences.reactions);
      if (!fresh.length && allowed.length === current.length) return current;
      return [...allowed, ...fresh].slice(-4);
    });
  }, [tracker, userId, state.server.activityHydrated, state.server.activity, preferences, active]);

  const item = queue[0];
  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => setQueue(current => current.slice(1)), 5000);
    return () => clearTimeout(timer);
  }, [item]);

  if (!item || !userId || previousUser.current !== userId || !active || !preferences.enabled || state.server.notificationPromptVisible) return null;
  const dismiss = () => setQueue(current => current.slice(1));
  const open = () => { dismiss(); router.push({ pathname: '/(flows)/moment/[id]', params: { id: item.updateId! } }); };
  return <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 12 }]}><ForegroundNotificationCard key={`${item.id}:${item.createdAt}`} item={item} onOpen={open} onDismiss={dismiss} /></View>;
}

export function ForegroundNotificationCard({ item, onOpen, onDismiss }: { item: ActivityItem; onOpen: () => void; onDismiss: () => void }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const message = item.kind === 'moment' ? 'Sent you a photo moment' : item.kind === 'comment' ? 'Commented on your moment' : `Reacted ${item.reaction ? reactionEmoji[item.reaction] : '❤️'} to your moment`;
  const eventIcon = item.kind === 'moment' ? 'photo-camera' : item.kind === 'comment' ? 'chat-bubble-outline' : 'favorite-border';
  return <SoftEntrance style={styles.banner}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.actor.displayName}: ${message}. Open moment.`} onPress={onOpen} style={styles.body}>
        <View style={styles.logo}><BrandLogo size={54} /><View style={styles.eventBadge}><MaterialIcons name={eventIcon} size={13} color={colors.background.accent} /></View></View>
        <View style={styles.copy} accessibilityLiveRegion="polite"><View style={styles.brandRow}><AppText style={styles.brand}>watchudoin?</AppText><AppText style={styles.time}>now</AppText></View><AppText variant="label14" numberOfLines={1}>{item.actor.displayName}</AppText><AppText style={styles.message} numberOfLines={2}>{message}</AppText></View>
        <Avatar name={item.actor.displayName} uri={item.actor.avatarUrl ?? undefined} size={30} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={onDismiss} style={styles.close}><MaterialIcons name="close" size={18} color={colors.text.secondary} /></Pressable>
    </SoftEntrance>;
}
const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  overlay: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000, elevation: 20 },
  banner: { width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 10 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingRight: 0, minHeight: 94 },
  logo: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.background.accentSoft, alignItems: 'center', justifyContent: 'center' },
  eventBadge: { position: 'absolute', right: -3, bottom: -3, width: 21, height: 21, borderRadius: 11, backgroundColor: colors.background.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.default },
  copy: { flex: 1, gap: 3 }, brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  brand: { color: colors.background.accent, fontFamily: 'Nunito_900Black', fontSize: 12, lineHeight: 17 },
  time: { color: colors.text.secondary, fontSize: 9, lineHeight: 14 }, message: { color: colors.text.secondary, fontSize: 11, lineHeight: 16 },
  close: { width: 44, minHeight: 72, alignItems: 'center', justifyContent: 'center' },
});
