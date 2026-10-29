import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Avatar, MomentPhoto, ReactionBar, Screen } from '@/src/components';
import { StatusBar } from 'expo-status-bar';
import { relativeTime, useAppStore } from '@/src/state/appStore';
import { spacing } from '@/src/theme';
import { isMomentRetained, momentDeletionLabel, MOMENT_RETENTION_MS } from '@/src/features/updates/momentRetention';
import { MomentComments } from '@/src/components/MomentComments';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { FullScreenMomentPhoto } from '@/src/components/FullScreenMomentPhoto';
import { DeleteMomentDialog } from '@/src/components/DeleteMomentDialog';
import { PhotoDownloadButton } from '@/src/components/PhotoDownloadButton';

export default function MomentDetailRoute() {
  const { colors, isDark, styles } = useThemeStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useAppStore();
  const [checked, setChecked] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fullPhoto, setFullPhoto] = useState(false);
  const [photoAspect, setPhotoAspect] = useState(1.44);
  const retriedPhotoRef = useRef(false);
  const seenRequestsRef = useRef(new Set<string>());
  const refreshUpdatesRef = useRef(actions.refreshUpdates);
  const markSeenRef = useRef(actions.markUpdateSeen);
  const refreshUpdateRef = useRef(actions.refreshUpdate);
  refreshUpdatesRef.current = actions.refreshUpdates;
  markSeenRef.current = actions.markUpdateSeen;
  refreshUpdateRef.current = actions.refreshUpdate;
  const updateId = typeof id === 'string' ? id : '';
  const update = state.server.updates.find((item) => item.id === updateId);
  const visibleUpdate = update && isMomentRetained(update.createdAt, now) && (update.senderId === state.server.profile?.id || !update.expiresAt || Date.parse(update.expiresAt) > now) ? update : undefined;
  const profileId = state.server.profile?.id;

  useEffect(() => {
    let active = true;
    setChecked(false);
    if (!profileId || !updateId) return;
    void refreshUpdateRef.current(updateId).finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [profileId, updateId]);

  useEffect(() => {
    if (visibleUpdate && profileId && visibleUpdate.senderId !== profileId && !visibleUpdate.seenAt && !seenRequestsRef.current.has(visibleUpdate.id)) {
      seenRequestsRef.current.add(visibleUpdate.id);
      void markSeenRef.current(visibleUpdate.id);
    }
  }, [profileId, visibleUpdate]);

  useEffect(() => {
    if (!update) return;
    const retentionDeadline = Date.parse(update.createdAt) + MOMENT_RETENTION_MS;
    const deadline = update.senderId === profileId || !update.expiresAt ? retentionDeadline : Math.min(retentionDeadline, Date.parse(update.expiresAt));
    if (!Number.isFinite(deadline)) return;
    const delay = deadline - Date.now();
    if (delay <= 0) { if (now < deadline) setNow(Date.now()); return; }
    const timer = setTimeout(() => setNow(Date.now()), Math.min(delay + 100, update.senderId === profileId ? 60_000 : 2_147_483_647));
    return () => clearTimeout(timer);
  }, [update?.createdAt, update?.expiresAt, update?.senderId, profileId, now]);

  const refreshExpiredPhoto = () => {
    if (retriedPhotoRef.current) return;
    retriedPhotoRef.current = true;
    void actions.refreshUpdate(updateId);
  };

  return (
    <Screen keyboardAvoiding backgroundColor={isDark ? colors.background.app : '#FAF7FF'} contentStyle={styles.content}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close moment" style={styles.spacer} onPress={() => router.back()}>
          <Feather color={styles.title.color} name="chevron-left" size={26} />
        </Pressable>
        <View style={styles.wordmark}><BrandWordmark size={22} /></View>
        <View style={styles.headerBalance} />
      </View>
      {!checked && !visibleUpdate ? <AppText variant="body14" tone="secondary">Loading moment...</AppText> : null}
      {checked && !visibleUpdate ? (
        <View style={styles.unavailable}>
          <AppText variant="title20">This moment is no longer available.</AppText>
          <AppText variant="body14" tone="secondary">It may have expired or is no longer shared with you.</AppText>
          <ActionButton label="Go to Moments" onPress={() => router.replace('/(tabs)/moments')} />
        </View>
      ) : null}
      {visibleUpdate && profileId ? (
        <MomentComments key={`${visibleUpdate.id}:${profileId}`} updateId={visibleUpdate.id} userId={profileId}>
        <View style={{ gap: 10 }}>
          <View style={{ position: 'relative' }}><Pressable accessibilityRole="button" accessibilityLabel="Open full photo" onPress={() => setFullPhoto(true)}><MomentPhoto photo={{ uri: visibleUpdate.photoUrl }} contentFit="contain" radius={18} style={{ aspectRatio: photoAspect }} onSize={(width, height) => { if (width && height) setPhotoAspect(Math.max(0.3, Math.min(3, width / height))); }} onLoadError={refreshExpiredPhoto} /><View pointerEvents="none" style={styles.expandPhoto}><Feather name="maximize-2" color="white" size={17} /></View></Pressable><View style={styles.photoDownload}><PhotoDownloadButton overlay updateId={visibleUpdate.id} /></View></View>
          <View style={styles.metadata}>
            <View style={styles.authorRow}><View><Avatar name={visibleUpdate.sender.displayName} uri={visibleUpdate.sender.avatarUrl ?? undefined} size={44} />{visibleUpdate.senderId === profileId ? <View accessible={false} style={styles.avatarDot} /> : null}</View><View style={{ flex: 1, gap: 3 }}><AppText style={styles.author}><AppText style={styles.title}>{visibleUpdate.senderId === profileId ? 'You' : visibleUpdate.sender.displayName}</AppText> · {visibleUpdate.statusText ?? 'Moment'}</AppText><AppText style={styles.time}>{relativeTime(visibleUpdate.createdAt)} ago</AppText></View>{visibleUpdate.senderId === profileId ? <Pressable accessibilityRole="button" accessibilityLabel="Delete your moment" onPress={() => setDeleteId(visibleUpdate.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Feather name="trash-2" color="#C85C6A" size={20} /></Pressable> : null}</View>
            {visibleUpdate.senderId === profileId && momentDeletionLabel(visibleUpdate.createdAt, now) ? <AppText variant="caption11" tone="secondary">{momentDeletionLabel(visibleUpdate.createdAt, now)} ? Save a copy if you?d like to keep it.</AppText> : null}
            {visibleUpdate.caption ? <AppText variant="body14">{visibleUpdate.caption}</AppText> : null}
            {profileId && visibleUpdate.senderId !== profileId ? <Pressable accessibilityRole="button" accessibilityLabel="Report moment" onPress={() => router.push({ pathname: '/(flows)/report', params: { updateId: visibleUpdate.id, userId: visibleUpdate.senderId, name: visibleUpdate.sender.displayName } })} style={styles.report}><AppText variant="caption11" tone="secondary">Report moment</AppText></Pressable> : null}
            {profileId ? (
            <View style={styles.reactionRow}><View style={styles.reactionPill}><ReactionBar compact
              busy={state.server.reactionUpdating === visibleUpdate.id}
              currentUserId={profileId}
              interactive={visibleUpdate.senderId !== profileId}
              reactions={visibleUpdate.reactions}
              onSelect={(reaction) => actions.reactToUpdate(visibleUpdate.id, reaction)}
            /></View></View>
            ) : null}
          </View>
          <FullScreenMomentPhoto visible={fullPhoto} uri={visibleUpdate.photoUrl} updateId={visibleUpdate.id} onClose={() => setFullPhoto(false)} />
          {state.server.error ? <View style={{ gap: 8 }}><AppText accessibilityRole="alert" style={{ color: '#FCA5A5' }}>{state.server.error}</AppText>{!state.server.termsStatus?.acceptedAt ? <ActionButton label="Review Terms" onPress={() => router.push('/(flows)/terms')} /> : null}</View> : null}
        </View>
        </MomentComments>
      ) : null}
      <DeleteMomentDialog updateId={deleteId} onCancel={() => setDeleteId(null)} onDeleted={() => { setDeleteId(null); if (router.canGoBack()) router.back(); else router.replace('/(tabs)/moments'); }} />
    </Screen>
  );
}

const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  content: { flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0, gap: 10, width: '100%', maxWidth: 600, alignSelf: 'center' },
  metadata: { padding: 14, gap: 10, backgroundColor: colors.background.card, borderRadius: 20, boxShadow: '0px 5px 20px rgba(116, 66, 192, 0.04)' },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', zIndex: 5 }, wordmark: { flex: 1, alignItems: 'center' },
  title: { fontSize: 14, lineHeight: 21, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? colors.text.primary : '#150B32' },
  spacer: { alignItems: 'center', justifyContent: 'center', height: 44, width: 44, borderRadius: 22, backgroundColor: isDark ? colors.background.accentSoft : '#F0E9FF' },
  headerBalance: { width: 44 }, report: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  photoDownload: { position: 'absolute', top: 10, right: 10 },
  expandPhoto: { position: 'absolute', right: 10, bottom: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, author: { fontSize: 14, lineHeight: 21, color: isDark ? colors.text.primary : '#150B32' }, time: { fontSize: 11, lineHeight: 17, color: isDark ? colors.text.secondary : '#948AA8' },
  avatarDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#BD96FF', borderWidth: 1, borderColor: colors.background.card },
  reactionRow: { borderTopWidth: 1, borderTopColor: isDark ? colors.border.default : '#EEE7F8', paddingTop: 6, flexDirection: 'row' }, reactionPill: { paddingHorizontal: 10, backgroundColor: isDark ? colors.background.loveSoft : '#FFF1F4', borderRadius: 22 },
  unavailable: { gap: spacing[12], paddingVertical: spacing[48] },
});
