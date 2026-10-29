import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppText, Avatar, Screen, SettingRow } from '@/src/components';
import { useProfileStats } from '@/src/features/profiles/useProfileStats';
import { useCircles } from '@/src/features/circles/useCircles';
import { useAppStore } from '@/src/state/appStore';

import { ConfirmationDialog } from '@/src/components/ConfirmationDialog';

export default function YouRoute() {
  const { colors, isDark, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const { stats, error } = useProfileStats();
  const { circles, loading: circlesLoading, error: circlesError } = useCircles();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutPending = useRef(false);
  const user = state.server.profile;
  const accepted = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  if (!user) return null;
  const logout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    try {
      if (await actions.signOut()) {
        setLogoutVisible(false);
        router.replace('/(onboarding)/sign-in');
      }
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
  };
  return <Screen scroll backgroundColor={isDark ? colors.background.app : '#FEFDFC'} contentStyle={styles.content}>
    <View style={styles.profile}><View style={styles.avatarRing}><Avatar name={user.displayName} uri={user.avatarUrl ?? undefined} size={86} /><View accessible={false} style={styles.avatarDot} /></View><View style={styles.copy}><AppText numberOfLines={2} style={styles.heading}>{user.displayName}</AppText><AppText style={styles.handle}>@{user.handle}</AppText>{user.bio ? <AppText style={styles.bio}>{user.bio}</AppText> : null}</View><Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/(flows)/settings')} style={styles.settings}><MaterialIcons name="settings" size={26} color={isDark ? colors.background.accent : '#2E0969'} /></Pressable></View>
    <ActionButton label="Edit profile" variant="secondary" icon={<Feather name="edit-2" color={colors.text.primary} size={19} />} onPress={() => router.push('/(flows)/edit-profile')} />
    <View style={styles.stats}>{[{ label: 'Moments', value: stats?.moments, path: '/(tabs)/moments' as const }, { label: 'Close People', value: accepted.length, path: '/(flows)/close-people' as const }, { label: 'Circles', value: circlesLoading && !circles.length ? undefined : circlesError ? undefined : circles.filter(circle => circle.status === 'member').length, path: '/(flows)/circles' as const }].map((item, index) => <Pressable key={item.label} accessibilityRole="button" onPress={() => router.push(item.path)} style={styles.stat}>{index > 0 ? <View style={styles.statDivider} /> : null}<AppText style={styles.statValue}>{item.value ?? '—'}</AppText><AppText style={styles.statLabel}>{item.label}</AppText></Pressable>)}</View>
    {error ? <AppText style={styles.handle}>{error}</AppText> : null}
    {circlesError ? <AppText style={styles.handle}>{circlesError}</AppText> : null}
    <View style={styles.rows}><SettingRow variant="profile" icon="person-outline" label="Account" onPress={() => router.push('/(flows)/account')} /><SettingRow variant="profile" icon="notifications-none" label="Notifications" onPress={() => router.push('/(flows)/notifications')} /><SettingRow variant="profile" icon="shield" label="Privacy & Safety" onPress={() => router.push('/(flows)/privacy-account')} /><SettingRow variant="profile" icon="help-outline" label="Help & Support" onPress={() => router.push('/(flows)/help')} /></View>
    <View style={{ marginTop: 2 }}><SettingRow variant="profile" icon="logout" label="Log out" onPress={() => { actions.clearServerFeedback(); setLogoutVisible(true); }} /></View>
    <ConfirmationDialog visible={logoutVisible} title="Log out?" message="Your moments will be here when you come back." confirmLabel="Log out" busy={loggingOut} error={state.server.error} onConfirm={() => void logout()} onCancel={() => setLogoutVisible(false)} />
    {state.server.error ? <AppText style={{ color: '#B42318' }}>{state.server.error}</AppText> : null}
  </Screen>;
}
const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  content: { gap: 20, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28, width: '100%', maxWidth: 600, alignSelf: 'center' },
  settings: { height: 44, width: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatarRing: { width: 94, height: 94, borderRadius: 47, backgroundColor: colors.background.card, alignItems: 'center', justifyContent: 'center' }, avatarDot: { position: 'absolute', bottom: 8, right: 3, width: 17, height: 17, borderRadius: 9, backgroundColor: '#792BFF', borderWidth: 3, borderColor: colors.background.card },
  copy: { flex: 1, gap: 4 }, heading: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 25, lineHeight: 33, color: isDark ? colors.text.primary : '#150B32' }, handle: { fontSize: 13, lineHeight: 20, color: colors.text.secondary }, bio: { fontSize: 11, lineHeight: 17, color: colors.text.secondary },
  stats: { flexDirection: 'row', minHeight: 78, paddingVertical: 12, backgroundColor: colors.background.card, borderRadius: 17, boxShadow: '0px 5px 18px rgba(35, 18, 57, 0.045)' }, stat: { alignItems: 'center', justifyContent: 'center', minHeight: 54, gap: 3, flex: 1 }, statDivider: { position: 'absolute', left: 0, height: 34, width: 1, backgroundColor: colors.border.default }, statValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, lineHeight: 30, color: isDark ? colors.background.accent : '#2F086A' }, statLabel: { fontSize: 10, lineHeight: 16, color: colors.text.secondary }, rows: { gap: 1 },
});
