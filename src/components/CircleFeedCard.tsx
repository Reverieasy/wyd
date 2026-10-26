import { SoftEntrance } from './SoftEntrance';
import { MotionPressable as Pressable } from './MotionPressable';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import type { MomentUpdate } from '@/src/models';
import { relativeTime, useAppStore } from '@/src/state/appStore';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { AppText } from './primitives/AppText';
import { Avatar } from './Avatar';
import { MomentPhoto } from './MomentPhoto';
import { ReactionBar } from './ReactionBar';

export function CircleFeedCard({ update }: { update: MomentUpdate }) {
  const { styles, colors } = useThemeStyles(makeStyles);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const { state, actions } = useAppStore();
  const mine = update.senderId === state.server.profile?.id;
  const open = () => router.push({ pathname: '/(flows)/moment/[id]', params: { id: update.id } });
  return <SoftEntrance style={styles.card}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${update.sender.displayName}'s profile`} onPress={() => router.push(mine ? '/(tabs)/you' : { pathname: '/(flows)/person/[id]', params: { id: update.senderId } })} style={styles.person}>
        <View><Avatar name={update.sender.displayName} uri={update.sender.avatarUrl ?? undefined} size={42} />{mine ? <View accessible={false} pointerEvents="none" style={styles.avatarDot} /> : null}</View>
        <View style={{ gap: 4, flex: 1 }}><AppText numberOfLines={1} style={styles.name}>{update.sender.displayName}{mine ? ' (you)' : ''}</AppText><AppText numberOfLines={1} style={styles.timestamp}>{relativeTime(update.createdAt)} ago{update.statusText ? ` · ${update.statusText}` : ''}</AppText></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Moment options" accessibilityState={{ expanded: optionsOpen }} onPress={() => setOptionsOpen(value => !value)} style={styles.optionsButton}><Feather name="more-horizontal" size={22} color={colors.text.secondary} /></Pressable>
      {optionsOpen ? <View style={styles.options}><Pressable accessibilityRole="button" style={styles.option} onPress={() => { setOptionsOpen(false); open(); }}><AppText variant="label12">View moment</AppText></Pressable><Pressable accessibilityRole="button" style={styles.option} onPress={() => { setOptionsOpen(false); router.push(mine ? '/(tabs)/you' : { pathname: '/(flows)/report', params: { updateId: update.id, userId: update.senderId, name: update.sender.displayName } }); }}><AppText variant="label12">{mine ? 'Your profile' : 'Report moment'}</AppText></Pressable></View> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${update.sender.displayName}'s photo`} onPress={open} style={styles.photo}>
      <MomentPhoto photo={{ uri: update.photoUrl }} radius={13} style={{ height: undefined, aspectRatio: 1.18 }} />
    </Pressable>
    <View style={styles.footer}>
      {update.caption ? <AppText variant="body14"><AppText variant="label14">{update.sender.displayName} </AppText>{update.caption}</AppText> : null}
      <View style={styles.actions}><ReactionBar compact currentUserId={state.server.profile?.id ?? ''} interactive={!mine} reactions={update.reactions} busy={state.server.reactionUpdating === update.id} onSelect={reaction => actions.reactToUpdate(update.id, reaction)} /><Pressable accessibilityRole="button" accessibilityLabel="View moment and comments" onPress={open} style={styles.comments}><Feather name="message-circle" size={19} color={styles.timestamp.color} /><AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.commentText}>Add a comment · View comments</AppText></Pressable></View>
    </View>
  </SoftEntrance>;
}
const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  card: { backgroundColor: colors.background.card, borderColor: isDark ? colors.border.default : '#EEEAF7', borderWidth: 1, borderRadius: 19, boxShadow: '0px 7px 24px rgba(38, 20, 75, 0.045)' },
  header: { paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', gap: 8, alignItems: 'center', zIndex: 3 }, person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44 },
  name: { fontSize: 14, lineHeight: 20, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? colors.text.primary : '#100C26' }, timestamp: { fontSize: 11, lineHeight: 16, color: isDark ? colors.text.secondary : '#827D99' },
  avatarDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#7324FF', borderWidth: 1.5, borderColor: colors.background.card },
  optionsButton: { minWidth: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? colors.background.subtle : '#FAF7FF', alignItems: 'center', justifyContent: 'center' },
  options: { position: 'absolute', right: 12, top: 58, padding: 5, borderRadius: 14, minWidth: 150, backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default, boxShadow: '0px 4px 18px rgba(30, 16, 55, 0.12)' }, option: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  photo: { marginHorizontal: 8 }, footer: { paddingHorizontal: 14, paddingBottom: 4, paddingTop: 3, gap: 6 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, comments: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minHeight: 44, flexShrink: 1 }, commentText: { flexShrink: 1, fontSize: 10, lineHeight: 16, color: isDark ? colors.text.secondary : '#827D99' },
});
