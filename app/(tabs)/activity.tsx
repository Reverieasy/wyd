import { MotionPressable as Pressable } from '@/src/components/MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, ActivityRow, AppText } from '@/src/components';
import type { ActivityItem } from '@/src/models';
import { useAppStore } from '@/src/state/appStore';

const filters = ['All', 'Moments', 'Reactions', 'Comments', 'Nudges'] as const;
export default function ActivityRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const actionsRef = useRef(actions); actionsRef.current = actions;
  const [filter, setFilter] = useState<typeof filters[number]>('All');
  useFocusEffect(useCallback(() => { void (async () => { await actionsRef.current.refreshActivity(); await actionsRef.current.markActivityRead(); })(); }, []));
  const data = state.server.activity.filter(item => filter === 'All' || (filter === 'Moments' && item.kind === 'moment') || (filter === 'Reactions' && item.kind === 'reaction') || (filter === 'Comments' && item.kind === 'comment') || (filter === 'Nudges' && item.kind === 'nudge'));
  const open = (item: ActivityItem) => {
    if (item.kind === 'nudge' && item.nudgeStatus !== 'responded' && item.nudgeId) { router.push({ pathname: '/(flows)/nudge', params: { id: item.nudgeId } }); return; }
    if (item.updateId) { router.push({ pathname: '/(flows)/moment/[id]', params: { id: item.updateId } }); return; }
    router.push('/(onboarding)/connect');
  };
  return <SafeAreaView edges={['top']} style={styles.safe}><FlatList data={data} keyExtractor={item => item.id} contentContainerStyle={styles.content} renderItem={({ item }) => <ActivityRow item={item} onPress={() => open(item)} />} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListHeaderComponent={<View style={styles.header}><AppText style={styles.title}>Activity</AppText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map(label => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: filter === label }} onPress={() => setFilter(label)} style={[styles.filter, filter === label && styles.selected]}><AppText style={[styles.filterText, filter === label && { color: 'white' }]}>{label}</AppText></Pressable>)}</ScrollView></View>} ListEmptyComponent={<AppText tone="secondary" style={{ textAlign: 'center', marginTop: 40 }}>{state.server.activityLoading ? 'Loading activity…' : 'No ' + (filter === 'All' ? 'activity' : filter.toLowerCase()) + ' yet.'}</AppText>} ListFooterComponent={<View style={{ gap: 12, paddingVertical: 20 }}>{state.server.activityError ? <><AppText style={{ color: '#B42318' }}>{state.server.activityError}</AppText><ActionButton label="Try again" variant="secondary" onPress={() => void actions.refreshActivity()} /></> : null}{state.server.activityHasMore ? <ActionButton label={state.server.activityLoadingMore ? 'Loading…' : 'Load older activity'} variant="secondary" loading={state.server.activityLoadingMore} onPress={() => void actions.loadMoreActivity()} /> : null}</View>} onEndReached={() => void actions.loadMoreActivity()} onEndReachedThreshold={0.4} showsVerticalScrollIndicator={false} refreshing={state.server.activityLoading} onRefresh={() => void actions.refreshActivity()} /></SafeAreaView>;
}
const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background.app }, content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, flexGrow: 1 }, header: { gap: 16, marginBottom: 20 }, title: { textAlign: 'center', color: colors.text.heading, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24, lineHeight: 32 }, filters: { flexDirection: 'row', gap: 8 }, filter: { minWidth: 76, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 22, borderColor: colors.border.default, borderWidth: 1, backgroundColor: colors.background.card }, selected: { backgroundColor: gradients.action[0], borderColor: colors.background.accent }, filterText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' } });
