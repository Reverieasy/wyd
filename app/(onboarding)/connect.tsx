import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Avatar, Screen, ScreenHeader, StatusChip, TextField } from '@/src/components';
import type { RelationshipType } from '@/src/models';
import { useAppStore } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';

const relationshipOptions: { value: RelationshipType; label: string }[] = [
  { value: 'partner', label: 'Partner' },
  { value: 'best_friend', label: 'Best friend' },
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
];

export default function ConnectRoute() {
  const { state, actions } = useAppStore();
  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('friend');
  const accepted = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  const incoming = state.server.connections.filter(({ connection, direction }) => connection.status === 'pending' && direction === 'incoming');
  const outgoing = state.server.connections.filter(({ connection, direction }) => connection.status === 'pending' && direction === 'outgoing');
  const result = state.server.profileSearch;
  const invite = state.server.invite;

  const submitCode = async () => {
    actions.clearServerFeedback();
    const connected = await actions.redeemInvite(inviteCode, relationship);
    if (connected) setInviteCode('');
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.screen}>
      <ScreenHeader eyebrow="Connect" title={'Stay close to\nyour people.'} subtitle="Invite someone new or connect with an existing account." />

      <View style={styles.inviteCard}>
        <View style={styles.inviteHeading}>
          <View style={styles.personCopy}>
            <AppText variant="label12" tone="secondary">MY INVITE</AppText>
            <AppText variant="title24" style={styles.inviteCode}>{invite?.code ?? '---- ----'}</AppText>
          </View>
          <View style={styles.qrPlaceholder}>
            <AppText variant="label12" tone="secondary">QR</AppText>
          </View>
        </View>
        {invite?.expiresAt ? <AppText variant="caption11" tone="secondary">Expires {new Date(invite.expiresAt).toLocaleDateString()}</AppText> : null}
        {!invite && state.server.inviteError ? <AppText variant="body14" style={styles.error}>{state.server.inviteError}</AppText> : null}
        <View style={styles.buttonRow}>
          <ActionButton label="Share Invite" disabled={!invite} onPress={() => void actions.shareInvite()} style={styles.rowButton} />
          <ActionButton label="Copy Code" variant="secondary" disabled={!invite} onPress={() => void actions.copyInvite()} style={styles.rowButton} />
        </View>
        <ActionButton label="Regenerate code" variant="secondary" loading={state.server.inviteLoading} onPress={() => void actions.regenerateInvite()} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <AppText variant="title20">Enter invite code</AppText>
          <AppText variant="body14" tone="secondary">Use a code someone shared with you.</AppText>
        </View>
        <TextField autoCapitalize="characters" autoCorrect={false} placeholder="Invite code" value={inviteCode} onChangeText={setInviteCode} onSubmitEditing={() => void submitCode()} />
        <View style={styles.relationships}>
          {relationshipOptions.map((option) => <StatusChip key={option.value} label={option.label} tone="neutral" selected={relationship === option.value} onPress={() => setRelationship(option.value)} />)}
        </View>
        {state.server.inviteError ? <AppText variant="body14" style={styles.error}>{state.server.inviteError}</AppText> : null}
        <ActionButton label="Connect with code" loading={state.server.inviteLoading} disabled={!inviteCode.trim()} onPress={() => void submitCode()} />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <AppText variant="title20">Search username</AppText>
          <AppText variant="body14" tone="secondary">Find an existing account by exact username.</AppText>
        </View>
        <TextField autoCapitalize="none" autoCorrect={false} placeholder="Username" value={username} onChangeText={setUsername} onSubmitEditing={() => void actions.searchProfile(username)} />
        <ActionButton label="Find person" variant="secondary" loading={state.server.busy} disabled={!username.trim()} onPress={() => void actions.searchProfile(username)} />
      </View>

      {result ? (
        <View style={styles.personCard}>
          <View style={styles.connectionRowPlain}>
            <Avatar name={result.displayName} uri={result.avatarUrl ?? undefined} size={56} />
            <View style={styles.personCopy}>
              <AppText variant="label14">{result.displayName}</AppText>
              <AppText variant="body14" tone="secondary">@{result.handle}</AppText>
            </View>
          </View>
          <View style={styles.relationships}>
            {relationshipOptions.map((option) => <StatusChip key={option.value} label={option.label} tone="neutral" selected={relationship === option.value} onPress={() => setRelationship(option.value)} />)}
          </View>
          <ActionButton label="Send request" loading={state.server.busy} onPress={() => void actions.requestConnection(relationship)} />
        </View>
      ) : null}

      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      {state.server.message ? <AppText variant="body14" style={styles.message}>{state.server.message}</AppText> : null}

      {incoming.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title20">Requests for you</AppText>
          {incoming.map(({ connection, person }) => (
            <View key={connection.id} style={styles.connectionRow}>
              <Avatar name={person.displayName} uri={person.avatarUrl ?? undefined} />
              <View style={styles.personCopy}>
                <AppText variant="label14">{person.displayName}</AppText>
                <AppText variant="caption11" tone="secondary">@{person.handle} | {connection.relationshipType.replace('_', ' ')}</AppText>
              </View>
              <ActionButton label="Accept" loading={state.server.busy} onPress={() => void actions.acceptConnection(connection.id)} style={styles.smallButton} />
            </View>
          ))}
        </View>
      ) : null}

      {outgoing.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title20">Waiting for them</AppText>
          {outgoing.map(({ connection, person }) => (
            <View key={connection.id} style={styles.connectionRow}>
              <Avatar name={person.displayName} uri={person.avatarUrl ?? undefined} />
              <View style={styles.personCopy}>
                <AppText variant="label14">{person.displayName}</AppText>
                <AppText variant="caption11" tone="secondary">@{person.handle} | pending</AppText>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {accepted.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title20">Connected</AppText>
          {accepted.map(({ connection, person }) => (
            <View key={connection.id} style={styles.connectionRow}>
              <Avatar name={person.displayName} uri={person.avatarUrl ?? undefined} selected />
              <View style={styles.personCopy}>
                <AppText variant="label14">{person.displayName}</AppText>
                <AppText variant="caption11" tone="secondary">@{person.handle}</AppText>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footerActions}>
        <ActionButton label="Refresh requests" variant="secondary" loading={state.server.busy} onPress={() => void actions.refreshConnections()} />
        <ActionButton label={accepted.length > 0 ? 'Back to your people' : 'Continue for now'} onPress={() => router.replace('/(tabs)/people')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing[28], paddingBottom: spacing[32] },
  section: { gap: spacing[12] },
  sectionHeading: { gap: spacing[4] },
  inviteCard: { backgroundColor: colors.background.card, borderColor: colors.border.default, borderRadius: radii[20], borderWidth: 1, gap: spacing[16], padding: spacing[20] },
  inviteHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing[16] },
  inviteCode: { marginTop: spacing[4] },
  qrPlaceholder: { alignItems: 'center', backgroundColor: colors.background.subtle, borderColor: colors.border.default, borderRadius: radii[14], borderWidth: 1, height: 64, justifyContent: 'center', width: 64 },
  buttonRow: { flexDirection: 'row', gap: spacing[10] },
  rowButton: { flex: 1, width: 'auto' },
  divider: { backgroundColor: colors.border.default, height: 1 },
  personCard: { backgroundColor: colors.background.card, borderRadius: radii[20], gap: spacing[12], padding: spacing[16] },
  personCopy: { flex: 1, gap: spacing[2] },
  relationships: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  connectionRow: { alignItems: 'center', backgroundColor: colors.background.card, borderRadius: radii[18], flexDirection: 'row', gap: spacing[12], padding: spacing[12] },
  connectionRowPlain: { alignItems: 'center', flexDirection: 'row', gap: spacing[12] },
  smallButton: { width: 92 },
  footerActions: { gap: spacing[12] },
  error: { color: '#B42318' },
  message: { color: colors.background.accent },
});
