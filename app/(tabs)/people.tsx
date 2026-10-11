import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, ReactionBar, Recipient, Screen, ScreenHeader, UpdateCard } from '@/src/components';
import { relativeTime, useAppStore } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';

export default function PeopleRoute() {
  const { state, actions } = useAppStore();
  const refreshUpdates = useRef(actions.refreshUpdates);
  const refreshActivity = useRef(actions.refreshActivity);
  const seenRequests = useRef(new Set<string>());
  const photoRetries = useRef(new Set<string>());
  refreshUpdates.current = actions.refreshUpdates;
  refreshActivity.current = actions.refreshActivity;
  const profile = state.server.profile;
  const accepted = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  const [selectedId, setSelectedId] = useState(accepted[0]?.person.id ?? '');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!accepted.some(({ person }) => person.id === selectedId)) setSelectedId(accepted[0]?.person.id ?? '');
  }, [accepted, selectedId]);

  useFocusEffect(useCallback(() => {
    void refreshUpdates.current();
    void refreshActivity.current();
  }, []));

  const selected = accepted.find(({ person }) => person.id === selectedId) ?? accepted[0];
  const person = selected?.person;
  const isCurrent = (expiresAt: string | null) => !expiresAt || Date.parse(expiresAt) > now;
  const personUpdate = person
    ? state.server.updates.find((update) => update.senderId === person.id && isCurrent(update.expiresAt))
    : undefined;
  const ownUpdate = profile
    ? state.server.updates.find((update) => update.senderId === profile.id && isCurrent(update.expiresAt))
    : undefined;

  useEffect(() => {
    const nextExpiry = state.server.updates
      .flatMap((item) => item.expiresAt ? [Date.parse(item.expiresAt)] : [])
      .filter((timestamp) => timestamp > Date.now())
      .sort((a, b) => a - b)[0];
    if (!nextExpiry) return;
    const timer = setTimeout(() => setNow(Date.now()), nextExpiry - Date.now() + 100);
    return () => clearTimeout(timer);
  }, [state.server.updates]);

  const retryPhoto = (updateId: string) => {
    if (photoRetries.current.has(updateId)) return;
    photoRetries.current.add(updateId);
    void actions.refreshUpdates();
  };

  useEffect(() => {
    if (personUpdate && profile && personUpdate.senderId !== profile.id && !personUpdate.seenAt && !seenRequests.current.has(personUpdate.id)) {
      seenRequests.current.add(personUpdate.id);
      void actions.markUpdateSeen(personUpdate.id);
    }
  }, [actions, personUpdate, profile]);

  if (!person) {
    const pendingCount = state.server.connections.filter(({ connection }) => connection.status === 'pending').length;
    return (
      <Screen contentStyle={styles.emptyScreen}>
        <ScreenHeader eyebrow="Today" title="Your people" subtitle="Tiny windows into their day." />
        <View style={styles.emptyState}>
          <View style={styles.emptyMark}><AppText variant="display32">+</AppText></View>
          <AppText variant="title24" style={styles.emptyText}>It's quiet here for now.</AppText>
          <AppText variant="body16" tone="secondary" style={styles.emptyText}>Invite someone you want to stay close to.</AppText>
          {pendingCount > 0 ? <AppText variant="caption11" tone="secondary">{pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}</AppText> : null}
        </View>
        <ActionButton label="Invite someone" onPress={() => router.push('/(onboarding)/connect')} />
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <ScreenHeader eyebrow="Today" title="Your people" subtitle="Tiny windows into their day." />

      {accepted.length > 1 ? (
        <View style={styles.peoplePicker}>
          {accepted.map(({ person: option }) => (
            <Recipient key={option.id} name={option.displayName} avatarUri={option.avatarUrl ?? undefined} selected={option.id === person.id} onPress={() => setSelectedId(option.id)} />
          ))}
        </View>
      ) : null}

      <Pressable accessibilityLabel={`Manage connection with ${person.displayName}`} accessibilityRole="button" onPress={() => router.push(`/(flows)/person/${person.id}`)} style={styles.manage}>
        <AppText variant="caption11" tone="secondary">Manage {person.displayName}</AppText>
      </Pressable>

      {state.server.updatesLoading && !personUpdate ? (
        <View style={styles.emptyMoment}>
          <AppText variant="title20">Loading moment...</AppText>
          <AppText variant="body14" tone="secondary">Checking for their latest update.</AppText>
        </View>
      ) : personUpdate ? (
        <UpdateCard
          personName={person.displayName}
          avatarUri={person.avatarUrl ?? undefined}
          photo={{ uri: personUpdate.photoUrl }}
          status={personUpdate.statusText ?? 'Moment'}
          timeAgo={relativeTime(personUpdate.createdAt)}
          caption={personUpdate.caption}
          onPhotoError={() => retryPhoto(personUpdate.id)}
          footer={profile ? (
            <ReactionBar
              busy={state.server.reactionUpdating === personUpdate.id}
              currentUserId={profile.id}
              reactions={personUpdate.reactions}
              onSelect={(reaction) => void actions.reactToUpdate(personUpdate.id, reaction)}
            />
          ) : null}
        />
      ) : (
        <View style={styles.emptyMoment}>
          <AppText variant="title20">No moment yet</AppText>
          <AppText variant="body14" tone="secondary">Their next update will show here for 24 hours.</AppText>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={state.server.nudgeSendingTo === person.id}
        onPress={() => void actions.sendNudge(person.id)}
        style={({ pressed }) => [styles.nudge, pressed && styles.pressed, state.server.nudgeSendingTo === person.id && styles.disabled]}
      >
        <AppText variant="label14">{'\u{1F44B}'} Nudge {person.displayName}</AppText>
      </Pressable>
      {state.server.message ? <AppText variant="body14" style={styles.message}>{state.server.message}</AppText> : null}
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      <ActionButton label="Invite another person" variant="secondary" onPress={() => router.push('/(onboarding)/connect')} />

      {state.server.updatesError ? (
        <View style={styles.feedback}>
          <AppText variant="body14" tone="secondary">{state.server.updatesError}</AppText>
          <ActionButton label="Try loading moments again" variant="secondary" onPress={() => void actions.refreshUpdates()} />
        </View>
      ) : null}

      {ownUpdate ? (
        <View style={styles.ownSection}>
          <AppText variant="title20">Your latest update</AppText>
          <UpdateCard
            personName="You"
            photo={{ uri: ownUpdate.photoUrl }}
            status={ownUpdate.statusText ?? 'Moment'}
            timeAgo={relativeTime(ownUpdate.createdAt)}
            caption={ownUpdate.caption}
            onPhotoError={() => retryPhoto(ownUpdate.id)}
            footer={profile ? <ReactionBar currentUserId={profile.id} interactive={false} reactions={ownUpdate.reactions} /> : null}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing[32] },
  emptyScreen: { justifyContent: 'space-between', paddingBottom: spacing[32] },
  emptyState: { alignItems: 'center', gap: spacing[12] },
  emptyMark: { alignItems: 'center', backgroundColor: colors.background.accentSoft, borderRadius: radii.full, height: 88, justifyContent: 'center', marginBottom: spacing[8], width: 88 },
  emptyText: { textAlign: 'center' },
  peoplePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  emptyMoment: { backgroundColor: colors.background.card, borderRadius: radii[20], gap: spacing[8], padding: spacing[24] },
  feedback: { gap: spacing[8] },
  ownSection: { gap: spacing[16], marginTop: spacing[8] },
  nudge: { alignItems: 'center', backgroundColor: colors.background.loveSoft, borderColor: '#F6D2DC', borderRadius: radii[18], borderWidth: 1, height: 52, justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  manage: { alignItems: 'center', alignSelf: 'flex-end', justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing[8] },
  message: { color: colors.background.accent, textAlign: 'center' },
  error: { color: '#B42318', textAlign: 'center' },
});
