import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, ReactionBar, Screen, UpdateCard } from '@/src/components';
import { relativeTime, useAppStore } from '@/src/state/appStore';
import { colors, spacing } from '@/src/theme';

export default function MomentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useAppStore();
  const [checked, setChecked] = useState(false);
  const [now, setNow] = useState(Date.now());
  const retriedPhotoRef = useRef(false);
  const seenRequestsRef = useRef(new Set<string>());
  const refreshUpdatesRef = useRef(actions.refreshUpdates);
  const markSeenRef = useRef(actions.markUpdateSeen);
  refreshUpdatesRef.current = actions.refreshUpdates;
  markSeenRef.current = actions.markUpdateSeen;
  const updateId = typeof id === 'string' ? id : '';
  const update = state.server.updates.find((item) => item.id === updateId);
  const visibleUpdate = update && (!update.expiresAt || Date.parse(update.expiresAt) > now) ? update : undefined;
  const profileId = state.server.profile?.id;

  useEffect(() => {
    let active = true;
    void refreshUpdatesRef.current().finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [updateId]);

  useEffect(() => {
    if (visibleUpdate && profileId && visibleUpdate.senderId !== profileId && !visibleUpdate.seenAt && !seenRequestsRef.current.has(visibleUpdate.id)) {
      seenRequestsRef.current.add(visibleUpdate.id);
      void markSeenRef.current(visibleUpdate.id);
    }
  }, [profileId, visibleUpdate]);

  useEffect(() => {
    if (!update?.expiresAt) return;
    const delay = Date.parse(update.expiresAt) - Date.now();
    if (delay <= 0) { setNow(Date.now()); return; }
    const timer = setTimeout(() => setNow(Date.now()), delay + 100);
    return () => clearTimeout(timer);
  }, [update?.expiresAt]);

  const refreshExpiredPhoto = () => {
    if (retriedPhotoRef.current) return;
    retriedPhotoRef.current = true;
    void refreshUpdatesRef.current();
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Close moment" hitSlop={12} onPress={() => router.back()}>
          <MaterialIcons color={colors.text.primary} name="close" size={24} />
        </Pressable>
        <AppText variant="label14">Moment</AppText>
        {visibleUpdate && profileId && visibleUpdate.senderId !== profileId ? (
          <Pressable accessibilityLabel="Report moment" accessibilityRole="button" hitSlop={12} onPress={() => router.push({ pathname: '/(flows)/report', params: { updateId: visibleUpdate.id, userId: visibleUpdate.senderId, name: visibleUpdate.sender.displayName } })} style={styles.spacer}>
            <MaterialIcons color={colors.text.secondary} name="more-horiz" size={24} />
          </Pressable>
        ) : <View style={styles.spacer} />}
      </View>
      {!checked && !visibleUpdate ? <AppText variant="body14" tone="secondary">Loading moment...</AppText> : null}
      {checked && !visibleUpdate ? (
        <View style={styles.unavailable}>
          <AppText variant="title20">This moment is no longer available.</AppText>
          <AppText variant="body14" tone="secondary">It may have expired or is no longer shared with you.</AppText>
          <ActionButton label="Go to Moments" onPress={() => router.replace('/(tabs)/moments')} />
        </View>
      ) : null}
      {visibleUpdate ? (
        <UpdateCard
          personName={visibleUpdate.senderId === profileId ? 'You' : visibleUpdate.sender.displayName}
          avatarUri={visibleUpdate.sender.avatarUrl ?? undefined}
          photo={{ uri: visibleUpdate.photoUrl }}
          status={visibleUpdate.statusText ?? 'Moment'}
          timeAgo={relativeTime(visibleUpdate.createdAt)}
          caption={visibleUpdate.caption}
          onPhotoError={refreshExpiredPhoto}
          footer={profileId ? (
            <ReactionBar
              busy={state.server.reactionUpdating === visibleUpdate.id}
              currentUserId={profileId}
              interactive={visibleUpdate.senderId !== profileId}
              reactions={visibleUpdate.reactions}
              onSelect={(reaction) => void actions.reactToUpdate(visibleUpdate.id, reaction)}
            />
          ) : null}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing[32] },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  spacer: { alignItems: 'center', justifyContent: 'center', minHeight: 44, width: 44 },
  unavailable: { gap: spacing[12], paddingVertical: spacing[48] },
});
