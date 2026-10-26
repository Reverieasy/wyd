import { router } from 'expo-router';
import { AppText, FlowHeader, Screen, SettingRow } from '@/src/components';
export default function HelpRoute() {
  return <Screen scroll><FlowHeader title="Help & Support" /><AppText variant="title24">Here for the little things.</AppText><AppText tone="secondary">Having trouble sharing, connecting, or receiving notifications? Send us a report from your account.</AppText><SettingRow icon="report-problem" label="Report a problem" onPress={() => router.push('/(flows)/report-problem')} /><SettingRow icon="notifications-none" label="Notification settings" onPress={() => router.push('/(flows)/notifications')} /><SettingRow icon="block" label="Blocked people" onPress={() => router.push('/(flows)/blocked-users')} /><SettingRow icon="description" label="Terms of Use" onPress={() => router.push('/(flows)/terms')} /><SettingRow icon="privacy-tip" label="Privacy Policy" onPress={() => router.push('/(flows)/privacy-policy')} /></Screen>;
}
