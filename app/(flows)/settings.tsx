import { router } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { StatusChip } from '@/src/components/StatusChip';
import { AppText, FlowHeader, Screen, SettingRow } from '@/src/components';

export default function SettingsRoute() {
  const { mode, setMode } = useTheme();
  return <Screen scroll><FlowHeader title="Settings" /><View style={{ gap: 12 }}><AppText variant="label14">Appearance</AppText><View style={{ flexDirection: 'row', gap: 8 }}>{(['light', 'dark', 'system'] as const).map(value => <StatusChip key={value} label={value === 'system' ? 'System' : value === 'dark' ? 'Dark' : 'Light'} selected={mode === value} onPress={() => setMode(value)} style={{ flex: 1, minWidth: 0 }} />)}</View></View><SettingRow icon="flag" label="Getting started" onPress={() => router.push('/(flows)/getting-started')} /><SettingRow icon="groups" label="Your circles" onPress={() => router.push('/(flows)/circles')} /><SettingRow icon="widgets" label="Home screen widget" onPress={() => router.push('/(flows)/widget')} /><SettingRow icon="person-outline" label="Account" onPress={() => router.push('/(flows)/account')} /><SettingRow icon="notifications-none" label="Notifications" onPress={() => router.push('/(flows)/notifications')} /><SettingRow icon="shield" label="Privacy & Safety" onPress={() => router.push('/(flows)/privacy-account')} /><SettingRow icon="help-outline" label="Help & Support" onPress={() => router.push('/(flows)/help')} /><AppText variant="caption11" tone="secondary">Moments leave active views after 24 hours. Moments is your last 30 days together. Photos are permanently deleted 30 days after upload.</AppText></Screen>;
}
