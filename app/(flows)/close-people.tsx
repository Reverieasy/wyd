import { useTheme } from '@/src/theme/ThemeProvider';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { ActionButton, AppText, FlowHeader, Screen } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { NudgeAvatar } from '@/src/components/NudgeAvatar';

export default function ClosePeopleRoute() {
  const { colors, gradients } = useTheme();
  const { state, actions } = useAppStore();
  const refresh = useRef(actions.refreshConnections); refresh.current = actions.refreshConnections;
  useFocusEffect(useCallback(() => { void refresh.current(); }, []));
  const people = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  return <Screen scroll><FlowHeader title="Close People" /><AppText tone="secondary">Your small circle. Tap a name to manage your connection. Hold a profile photo for 3 seconds to nudge.</AppText>{people.map(({ person }, index) => <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default }}><NudgeAvatar name={person.displayName} uri={person.avatarUrl ?? undefined} palette={index} busy={state.server.nudgeSendingTo === person.id} disabled={state.server.nudgeSendingTo !== null && state.server.nudgeSendingTo !== person.id} onPress={() => router.push({ pathname: '/(flows)/person/[id]', params: { id: person.id } })} onNudge={() => actions.sendNudge(person.id)} /><Pressable accessibilityRole="button" accessibilityLabel={`Manage connection with ${person.displayName}`} onPress={() => router.push({ pathname: '/(flows)/person/[id]', params: { id: person.id } })} style={{ flex: 1, minHeight: 64, justifyContent: 'center' }}><AppText variant="label14">{person.displayName}</AppText><AppText variant="caption11" tone="secondary">@{person.handle}</AppText></Pressable><AppText style={{ color: colors.background.accent }}>{'\u2192'}</AppText></View>)}{state.server.message ? <AppText accessibilityLiveRegion="polite">{state.server.message}</AppText> : null}{state.server.error ? <AppText accessibilityRole="alert" style={{ color: '#DA645B' }}>{state.server.error}</AppText> : null}{!people.length ? <AppText tone="secondary">Your people will appear here after a connection is accepted.</AppText> : null}<ActionButton label="Find your person" onPress={() => router.push('/(onboarding)/connect')} /></Screen>;
}
