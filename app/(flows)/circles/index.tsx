import { router } from 'expo-router';
import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActionButton, AppText, FlowHeader, Screen } from '@/src/components';
import { MotionPressable } from '@/src/components/MotionPressable';
import { useCircles } from '@/src/features/circles/useCircles';
import { useAppStore } from '@/src/state/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';

export default function CirclesRoute() {
  const { circles, loading, error, refresh } = useCircles();
  const { state } = useAppStore();
  const { colors } = useTheme();
  return <Screen scroll><FlowHeader title="Your circles" /><AppText tone="secondary">A little space for your people. The host approves everyone who asks to join.</AppText>
    <View style={{ gap: 10 }}><ActionButton label="Create circle" onPress={() => router.push('/(flows)/circles/create')} /><ActionButton label="Join with code or link" variant="secondary" onPress={() => router.push('/join-circle')} /></View>
    {loading && !circles.length ? <AppText tone="secondary">Loading your circles…</AppText> : null}
    {circles.map(circle => <MotionPressable key={circle.id} accessibilityRole="button" accessibilityLabel={`Open ${circle.name}`} onPress={() => router.push({ pathname: '/(flows)/circles/[id]', params: { id: circle.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card }}>
      <MaterialIcons name="groups" size={30} color={colors.background.accent} /><View style={{ flex: 1, gap: 4 }}><AppText variant="label14">{circle.name}</AppText><AppText variant="caption11" tone="secondary">{circle.status === 'pending' ? 'Waiting for host approval' : circle.status === 'declined' ? 'Request declined' : `${circle.memberCount} ${circle.memberCount === 1 ? 'member' : 'members'}${circle.hostId === state.server.profile?.id ? ' · You are the host' : ''}`}</AppText>{circle.hostId === state.server.profile?.id && circle.pendingCount ? <AppText variant="caption11" style={{ color: colors.background.accent }}>{circle.pendingCount} {circle.pendingCount === 1 ? 'join request' : 'join requests'}</AppText> : null}</View><MaterialIcons name="chevron-right" size={22} color={colors.text.secondary} />
    </MotionPressable>)}
    {!loading && !circles.length && !error ? <AppText tone="secondary">Create your first circle or ask a host for an invite link.</AppText> : null}
    {error ? <AppText accessibilityRole="alert" style={{ color: '#DA645B' }}>{error}</AppText> : null}
    <ActionButton label="Refresh circles" variant="secondary" loading={loading} onPress={() => void refresh()} />
  </Screen>;
}
