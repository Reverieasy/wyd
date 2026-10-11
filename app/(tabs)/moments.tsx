import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, MomentRow, ReactionBar, ScreenHeader } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { colors, layout, spacing } from '@/src/theme';

export default function MomentsRoute() {
  const { state, actions } = useAppStore();
  const refreshUpdates = useRef(actions.refreshUpdates);
  const photoRetries = useRef(new Set<string>());
  refreshUpdates.current = actions.refreshUpdates;
  useFocusEffect(useCallback(() => {
    void refreshUpdates.current();
  }, []));
  const chronological = [...state.server.updates]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const profileId = state.server.profile?.id;
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.content}
        data={chronological}
        keyExtractor={(update) => update.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<ScreenHeader eyebrow="Moments" title="Today" style={styles.header} />}
        ListEmptyComponent={<AppText variant="body14" tone="secondary">{state.server.updatesLoading ? 'Loading moments...' : 'No little moments yet.'}</AppText>}
        ListFooterComponent={state.server.updatesError ? (
          <View style={styles.feedback}>
            <AppText variant="body14" tone="secondary">{state.server.updatesError}</AppText>
            <AppText accessibilityRole="button" variant="label14" onPress={() => void actions.refreshUpdates()}>Try again</AppText>
          </View>
        ) : state.server.updatesLoadingMore ? <AppText variant="caption11" tone="secondary" style={styles.loadingMore}>Loading older moments...</AppText> : null}
        onEndReached={() => void actions.loadMoreUpdates()}
        onEndReachedThreshold={0.4}
        renderItem={({ item: update }) => (
          <MomentRow
            update={update}
            author={update.sender}
            showSeen={update.senderId === profileId}
            onPhotoError={() => {
              if (photoRetries.current.has(update.id)) return;
              photoRetries.current.add(update.id);
              void actions.refreshUpdates();
            }}
            footer={profileId ? (
              <ReactionBar
                busy={state.server.reactionUpdating === update.id}
                currentUserId={profileId}
                interactive={update.senderId !== profileId}
                reactions={update.reactions}
                onSelect={(reaction) => void actions.reactToUpdate(update.id, reaction)}
              />
            ) : null}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background.app, flex: 1 },
  content: { flexGrow: 1, paddingBottom: spacing[32], paddingHorizontal: layout.screenPadding, paddingTop: spacing[20] },
  header: { marginBottom: spacing[24] },
  separator: { height: spacing[12] },
  feedback: { gap: spacing[8], paddingTop: spacing[16] },
  loadingMore: { paddingVertical: spacing[16], textAlign: 'center' },
});
