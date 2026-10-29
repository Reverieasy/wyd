import { router } from 'expo-router';
import { AppText, FlowHeader, Screen, SettingRow } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
export default function AccountRoute() {
  const { state } = useAppStore();
  return <Screen scroll><FlowHeader title="Account" /><AppText variant="title24">{state.server.profile?.displayName}</AppText><SettingRow icon="email" label="Email" value={state.server.session?.user.email} /><SettingRow icon="edit" label="Edit name, username & bio" onPress={() => router.push('/(flows)/edit-profile')} /><SettingRow icon="qr-code" label="My QR code" onPress={() => router.push('/(flows)/my-qr')} /><SettingRow icon="people-outline" label="Close People" onPress={() => router.push('/(flows)/close-people')} /><SettingRow icon="lock-outline" label="Reset password" onPress={() => router.push('/(onboarding)/forgot-password')} /><SettingRow accent icon="delete-outline" label="Delete account" value="Permanently remove your data" onPress={() => router.push('/(flows)/delete-account')} /></Screen>;
}
