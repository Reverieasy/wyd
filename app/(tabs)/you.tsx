import { router } from 'expo-router';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { AppText, Avatar, Screen, ScreenHeader, SettingRow } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { colors, spacing } from '@/src/theme';

export default function YouRoute() {
  const { state, actions } = useAppStore();
  const user = state.server.profile;
  const accepted = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  const defaultRecipient = accepted[0]?.person;
  const switchColors = { false: colors.background.subtle, true: colors.background.accent };
  const notificationPreferences = state.server.notificationPreferences;
  const notificationsOn = notificationPreferences.enabled && state.server.notificationPermission === 'granted';
  if (!user) return null;

  const switchAccount = () => {
    Alert.alert('Switch account?', 'You will be signed out and returned to login.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch account', style: 'destructive', onPress: () => void (async () => {
        await actions.signOut();
        router.replace('/(onboarding)/sign-in');
      })() },
    ]);
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <ScreenHeader eyebrow="You" />
      <View style={styles.profile}>
        <Avatar name={user.displayName} uri={user.avatarUrl ?? undefined} size={88} />
        <AppText variant="title24">{user.displayName}</AppText>
        <AppText variant="body14" tone="secondary">@{user.handle}</AppText>
      </View>
      <View style={styles.settings}>
        <SettingRow icon="edit" label="Edit profile" onPress={() => router.push('/(flows)/edit-profile')} />
        <SettingRow icon="favorite-border" label="Default recipient" value={defaultRecipient ? `${defaultRecipient.displayName} \u2764\uFE0F` : 'None'} />
        <SettingRow icon="people-outline" label="Connections" value={`${accepted.length} accepted`} onPress={() => router.push('/(onboarding)/connect')} />
      </View>
      <View style={styles.section}>
        <AppText variant="caption11" tone="secondary">NOTIFICATIONS</AppText>
        <View style={styles.settings}>
          <SettingRow icon="notifications-none" label="Notifications" value={state.server.notificationPermission === 'denied' ? 'Off in system settings' : notificationsOn ? 'On' : 'Off'} control={<Switch trackColor={switchColors} thumbColor={colors.background.card} value={notificationsOn} disabled={state.server.notificationsLoading} onValueChange={(value) => value ? void actions.enableNotifications() : void actions.setNotificationPreference('enabled', false)} />} />
          <SettingRow label="Moments" control={<Switch trackColor={switchColors} thumbColor={colors.background.card} value={notificationPreferences.moments} disabled={!notificationPreferences.enabled || state.server.notificationsLoading} onValueChange={(value) => void actions.setNotificationPreference('moments', value)} />} />
          <SettingRow label="Nudges" control={<Switch trackColor={switchColors} thumbColor={colors.background.card} value={notificationPreferences.nudges} disabled={!notificationPreferences.enabled || state.server.notificationsLoading} onValueChange={(value) => void actions.setNotificationPreference('nudges', value)} />} />
          <SettingRow label="Reactions" control={<Switch trackColor={switchColors} thumbColor={colors.background.card} value={notificationPreferences.reactions} disabled={!notificationPreferences.enabled || state.server.notificationsLoading} onValueChange={(value) => void actions.setNotificationPreference('reactions', value)} />} />
          <SettingRow label="Connections" control={<Switch trackColor={switchColors} thumbColor={colors.background.card} value={notificationPreferences.connections} disabled={!notificationPreferences.enabled || state.server.notificationsLoading} onValueChange={(value) => void actions.setNotificationPreference('connections', value)} />} />
          {state.server.notificationPermission === 'denied' ? <SettingRow accent icon="settings" label="Open system settings" onPress={() => void actions.openNotificationSettings()} /> : null}
        </View>
      </View>
      <View style={styles.settings}>
        <SettingRow icon="notifications-off" label="Quiet updates" value={state.local.preferences.quietUpdatesEnabled ? 'On' : 'Off'} control={<Switch trackColor={switchColors} thumbColor={colors.background.card} value={state.local.preferences.quietUpdatesEnabled} onValueChange={(value) => actions.setPreference('quietUpdatesEnabled', value)} />} />
        <SettingRow icon="history" label="Recent moments" value={`${state.local.preferences.recentMomentsDays} days`} />
        <SettingRow icon="lock-outline" label="Privacy & account" value="Safety, legal, and account controls" onPress={() => router.push('/(flows)/privacy-account')} />
        <SettingRow icon="description" label="Terms of Use" value={state.server.termsStatus?.acceptedAt ? 'Accepted' : 'Review required'} onPress={() => router.push('/(flows)/terms')} />
      </View>
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      {state.server.notificationError ? <AppText variant="body14" style={styles.error}>{state.server.notificationError}</AppText> : null}
      <SettingRow accent icon="switch-account" label="Switch account" onPress={switchAccount} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing[32] },
  profile: { alignItems: 'center', gap: spacing[4], marginBottom: spacing[24] },
  settings: { gap: spacing[10] },
  section: { gap: spacing[10] },
  error: { color: '#B42318' },
});
