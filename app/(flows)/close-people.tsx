import { useTheme } from '@/src/theme/ThemeProvider';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { ActionButton, AppText, FlowHeader, Screen } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { NudgeAvatar } from '@/src/components/NudgeAvatar';

export default function ClosePeopleRoute() {
  const { colors } = useTheme();
  const { state, actions } = useAppStore();
  const refresh = useRef(actions.refreshConnections); refresh.current = actions.refreshConnections;
  useFocusEffect(useCallback(() => { void refresh.current(); }, []));
  const people = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  return <Screen scroll contentStyle={{ gap: 12 }}><FlowHeader title="Close People" />{people.map(({ person }, index) => <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.background.card }}><NudgeAvatar variant="compact" size={40} name={person.displayName} uri={person.avatarUrl ?? undefined} palette={index} busy={state.server.nudgeSendingTo === person.id} disabled={state.server.nudgeSendingTo !== null && state.server.nudgeSendingTo !== person.id} onPress={() => router.push({ pathname: '/(flows)/person/[id]', params: { id: person.id } })} onNudge={() => actions.sendNudge(person.id)} /><Pressable accessibilityRole="button" accessibilityLabel={`Manage connection with ${person.displayName}`} onPress={() => router.push({ pathname: '/(flows)/person/[id]', params: { id: person.id } })} style={{ flex: 1, minHeight: 48, justifyContent: 'center', gap: 2 }}><AppText variant="label14" numberOfLines={1}>{person.displayName}</AppText><AppText variant="caption11" tone="secondary" numberOfLines={1}>@{person.handle}</AppText></Pressable></View>)}{state.server.message ? <AppText accessibilityLiveRegion="polite">{state.server.message}</AppText> : null}{state.server.error ? <AppText accessibilityRole="alert" style={{ color: '#DA645B' }}>{state.server.error}</AppText> : null}{!people.length ? <AppText tone="secondary">Your people will appear here after a connection is accepted.</AppText> : null}<ActionButton label="Find your person" onPress={() => router.push('/(onboarding)/connect')} /></Screen>;
}
