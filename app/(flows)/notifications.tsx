import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { ActionButton, AppText, FlowHeader, Screen, SettingRow } from '@/src/components';
import type { NotificationPreferences } from '@/src/features/notifications/notificationService';
import { useAppStore } from '@/src/state/appStore';

const options: { key: keyof NotificationPreferences; label: string }[] = [{ key: 'moments', label: 'Moments' }, { key: 'nudges', label: 'Nudges' }, { key: 'reactions', label: 'Reactions' }, { key: 'comments', label: 'Comments' }, { key: 'connections', label: 'Connections' }];
export default function NotificationsRoute() {
  const { colors, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const prefs = state.server.notificationPreferences;
  const permission = state.server.notificationPermission;
  const trackColor = { false: colors.border.default, true: colors.background.accent };
  return <Screen scroll><FlowHeader title="Notifications" />
    <AppText tone="secondary">Choose which little updates reach you. Photo, comment, and reaction popups appear while the app is open.</AppText>
    <View style={styles.rows}>
      <SettingRow icon="notifications-none" label="Allow notifications" value={prefs.enabled ? 'On' : 'Off'} control={<Switch accessibilityLabel="Allow notifications" trackColor={trackColor} value={prefs.enabled} disabled={state.server.notificationsLoading} onValueChange={value => void actions.setNotificationPreference('enabled', value)} />} />
      {options.map(({ key, label }) => <SettingRow key={key} label={label} control={<Switch accessibilityLabel={label + ' notifications'} trackColor={trackColor} value={prefs[key]} disabled={!prefs.enabled || state.server.notificationsLoading} onValueChange={value => void actions.setNotificationPreference(key, value)} />} />)}
    </View>
    {Platform.OS === 'web' ? <AppText variant="caption11" tone="secondary">Web popups appear while this app is open. Phone notifications are available in the installed mobile app.</AppText> : <View style={styles.rows}><AppText variant="label14">Phone notifications</AppText><AppText tone="secondary">{permission === 'granted' ? 'Allowed on this device.' : permission === 'denied' ? 'Off in system settings. In-app popups still work.' : permission === 'unavailable' ? 'Phone push is not configured in this build. In-app alerts still work.' : 'Enable phone notifications to receive updates while the app is closed.'}</AppText>{permission === 'undetermined' ? <ActionButton label="Enable phone notifications" loading={state.server.notificationsLoading} disabled={!prefs.enabled} onPress={() => void actions.enableNotifications()} /> : null}{permission === 'denied' ? <SettingRow icon="settings" label="Open system settings" onPress={() => void actions.openNotificationSettings()} /> : null}</View>}
    {state.server.notificationError ? <AppText accessibilityRole="alert" style={styles.error}>{state.server.notificationError}</AppText> : null}
  </Screen>;
}
const makeStyles = ({ colors }: Theme) => StyleSheet.create({ rows: { gap: 10 }, error: { color: '#DA645B' } });
