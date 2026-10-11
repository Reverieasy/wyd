import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityRow, AppText, ScreenHeader } from '@/src/components';
import type { ActivityItem } from '@/src/models';
import { useAppStore } from '@/src/state/appStore';
import { colors, layout, spacing } from '@/src/theme';

function isToday(date: string) {
  const value = new Date(date);
  const now = new Date();
  return value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth() && value.getDate() === now.getDate();
}

export default function ActivityRoute() {
  const { state, actions } = useAppStore();
  const refresh = useRef(actions.refreshActivity);
  const markRead = useRef(actions.markActivityRead);
  refresh.current = actions.refreshActivity;
  markRead.current = actions.markActivityRead;

  useFocusEffect(useCallback(() => {
    void (async () => {
      await refresh.current();
      await markRead.current();
    })();
  }, []));

  const today = state.server.activity.filter((item) => isToday(item.createdAt));
  const earlier = state.server.activity.filter((item) => !isToday(item.createdAt));

  const open = (item: ActivityItem) => {
    if (item.kind === 'nudge' && item.nudgeStatus === 'responded' && item.updateId) {
      router.push({ pathname: '/(flows)/moment/[id]', params: { id: item.updateId } });
      return;
    }
    if (item.kind === 'nudge' && item.nudgeId) {
      router.push({ pathname: '/(flows)/nudge', params: { id: item.nudgeId } });
      return;
    }
    if (item.kind === 'connection_request') {
      router.push('/(onboarding)/connect');
      return;
    }
    if ((item.kind === 'moment' || item.kind === 'reaction') && item.updateId) {
      router.push({ pathname: '/(flows)/moment/[id]', params: { id: item.updateId } });
      return;
    }
    router.push('/(tabs)/moments');
  };

  const sections = [
    ...(today.length > 0 ? [{ title: 'TODAY', data: today }] : []),
    ...(earlier.length > 0 ? [{ title: 'EARLIER', data: earlier }] : []),
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <SectionList
        contentContainerStyle={styles.content}
        sections={sections}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        renderItem={({ item }) => <ActivityRow item={item} onPress={() => open(item)} />}
        renderSectionHeader={({ section }) => <AppText variant="caption11" tone="secondary" style={styles.sectionHeader}>{section.title}</AppText>}
        ListHeaderComponent={<ScreenHeader eyebrow="Activity" title="The little things" subtitle="Nudges, reactions, and your people." style={styles.header} />}
        ListEmptyComponent={(
          <View style={styles.empty}>
            {state.server.activityLoading ? <AppText variant="body14" tone="secondary">Loading activity...</AppText> : <><AppText variant="title20">All quiet for now.</AppText><AppText variant="body14" tone="secondary">Nudges and reactions from your people will show up here.</AppText></>}
          </View>
        )}
        ListFooterComponent={state.server.activityError
          ? <AppText variant="body14" style={styles.error}>{state.server.activityError}</AppText>
          : state.server.activityLoadingMore ? <AppText variant="caption11" tone="secondary" style={styles.loadingMore}>Loading older activity...</AppText> : null}
        onEndReached={() => void actions.loadMoreActivity()}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background.app, flex: 1 },
  content: { flexGrow: 1, paddingBottom: spacing[32], paddingHorizontal: layout.screenPadding, paddingTop: spacing[20] },
  header: { marginBottom: spacing[24] },
  sectionHeader: { marginBottom: spacing[12], marginTop: spacing[20] },
  rowSeparator: { height: spacing[10] },
  empty: { alignItems: 'center', gap: spacing[8], paddingVertical: spacing[48] },
  error: { color: '#B42318', marginTop: spacing[16] },
  loadingMore: { paddingVertical: spacing[16], textAlign: 'center' },
});
