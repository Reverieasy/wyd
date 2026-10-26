import { MotionPressable as Pressable } from '@/src/components/MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { ActionButton, AppText, MomentPhoto } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { isMomentRetained } from '@/src/features/updates/momentRetention';
import { PhotoDownloadButton } from '@/src/components/PhotoDownloadButton';

function dayLabel(value: string) {
  const date = new Date(value), today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  today.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export default function MomentsRoute() {
  const { colors, isDark, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const refresh = useRef(actions.refreshUpdates); refresh.current = actions.refreshUpdates;
  const photoRetries = useRef(new Set<string>());
  const [now, setNow] = useState(Date.now());
  const [optionsId, setOptionsId] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    setNow(Date.now()); void refresh.current();
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []));
  const width = (Math.min(useWindowDimensions().width, 600) - 50) / 2;
  const own = state.server.updates.filter(item => item.senderId === state.server.profile?.id && isMomentRetained(item.createdAt, now)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const open = (id: string) => { setOptionsId(null); router.push({ pathname: '/(flows)/moment/[id]', params: { id } }); };
  return <SafeAreaView edges={['top']} style={styles.safe}><FlatList
    numColumns={2} data={own} keyExtractor={item => item.id} columnWrapperStyle={styles.gridRow} contentContainerStyle={styles.content}
    ListHeaderComponent={<View style={styles.header}>
      <AppText style={styles.title}>Moments</AppText><AppText style={styles.subtitle}>Your last 30 days of little moments.</AppText>
      <LinearGradient colors={isDark ? ['#362447', '#2D203A'] : ['#F7F0FF', '#F0E7FC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.notice}>
        <View style={styles.clock}><Feather name="clock" size={23} color={colors.background.accent} /></View>
        <View style={styles.noticeCopy}><AppText style={styles.noticeTitle}>Photos are permanently deleted</AppText><AppText style={styles.noticeText}>30 days after upload.</AppText></View>
        <View accessible={false} pointerEvents="none" style={styles.art}><View style={[styles.artPhoto, styles.artBack]}><Feather name="image" size={25} color="white" /></View><View style={[styles.artPhoto, styles.artFront]}><Feather name="image" size={25} color="white" /></View></View>
      </LinearGradient>
    </View>}
    renderItem={({ item }) => <View style={[styles.tile, { width }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={(item.caption ?? item.statusText ?? 'Moment') + ', ' + dayLabel(item.createdAt)} onPress={() => open(item.id)}><MomentPhoto photo={{ uri: item.photoUrl }} radius={0} style={{ aspectRatio: 1.65 }} onLoadError={() => { if (photoRetries.current.has(item.id)) return; photoRetries.current.add(item.id); void actions.refreshUpdates(); }} /></Pressable>
      <View style={styles.tileFooter}><Pressable accessibilityRole="button" accessibilityLabel={`Open moment from ${dayLabel(item.createdAt)}`} onPress={() => open(item.id)} style={styles.dateButton}><AppText style={styles.tileText}>{dayLabel(item.createdAt)}</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Moment options" onPress={() => setOptionsId(item.id)} style={styles.optionsButton}><Feather name="more-horizontal" size={17} color={colors.text.secondary} /></Pressable></View>
    </View>}
    ListEmptyComponent={<AppText tone="secondary" style={styles.empty}>{state.server.updatesLoading ? 'Loading moments…' : 'Your moments will find a little home here.'}</AppText>}
    ListFooterComponent={<View style={styles.footer}>{state.server.updatesError ? <AppText accessibilityRole="alert" style={styles.error}>{state.server.updatesError}</AppText> : null}{state.server.updatesHasMore ? <ActionButton label="Load older moments" loading={state.server.updatesLoadingMore} variant="secondary" onPress={() => void actions.loadMoreUpdates()} /> : null}<AppText style={styles.retention}>Shared moments leave Home after 24 hours. All moment photos are permanently deleted after 30 days.</AppText></View>}
    onEndReached={() => { if (!state.server.updatesLoading && !state.server.updatesError) void actions.loadMoreUpdates(); }} onEndReachedThreshold={0.4} refreshing={state.server.updatesLoading} onRefresh={() => void actions.refreshUpdates()} showsVerticalScrollIndicator={false}
  /><Modal transparent visible={!!optionsId} animationType="none" onRequestClose={() => setOptionsId(null)}><View style={styles.backdrop}><View accessibilityViewIsModal style={styles.optionsCard}><AppText variant="title20">Your moment</AppText>{optionsId ? <PhotoDownloadButton updateId={optionsId} /> : null}<ActionButton label="View photo and comments" onPress={() => { if (optionsId) open(optionsId); }} /><ActionButton label="Cancel" variant="secondary" onPress={() => setOptionsId(null)} /></View></View></Modal></SafeAreaView>;
}
const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  safe: { backgroundColor: isDark ? colors.background.app : '#FFFEFC', flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { marginBottom: 12, gap: 3 }, title: { fontSize: 36, lineHeight: 46, letterSpacing: -1.3, color: isDark ? colors.text.primary : '#101321', fontFamily: 'PlusJakartaSans_800ExtraBold' }, subtitle: { fontSize: 12, lineHeight: 19, color: colors.text.secondary },
  notice: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingHorizontal: 13, paddingVertical: 12, marginTop: 11, borderRadius: 16 }, clock: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? colors.background.subtle : '#FAF7FF' }, noticeCopy: { flex: 1, gap: 2 }, noticeTitle: { fontSize: 12, lineHeight: 18, color: isDark ? colors.background.accent : '#492086', fontFamily: 'PlusJakartaSans_700Bold' }, noticeText: { fontSize: 12, lineHeight: 18, color: colors.text.secondary }, art: { width: 43, height: 42 }, artPhoto: { position: 'absolute', width: 33, height: 31, borderRadius: 7, borderWidth: 2, borderColor: '#F9F5FF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#DBBEFA' }, artBack: { right: 0, top: 0, transform: [{ rotate: '16deg' }] }, artFront: { left: 0, bottom: 0, transform: [{ rotate: '-11deg' }] },
  gridRow: { gap: 10 }, tile: { marginBottom: 10, borderRadius: 14, backgroundColor: colors.background.card, overflow: 'hidden', boxShadow: '0px 4px 12px rgba(26, 14, 41, 0.07)' }, tileFooter: { flexDirection: 'row', alignItems: 'center', paddingLeft: 11, minHeight: 35 }, dateButton: { flex: 1, minHeight: 44, justifyContent: 'center' }, optionsButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }, tileText: { fontSize: 11, lineHeight: 17, color: colors.text.primary },
  footer: { gap: 18, paddingTop: 18 }, retention: { textAlign: 'center', fontSize: 10, lineHeight: 16, color: colors.text.secondary }, empty: { textAlign: 'center', paddingVertical: 40 }, error: { color: '#B42318' }, backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(25, 15, 40, 0.35)' }, optionsCard: { gap: 14, padding: 22, borderRadius: 22, width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: colors.background.card },
});
