import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, MomentPhoto, Screen, ScreenHeader } from '@/src/components';
import { clockTime, useAppStore } from '@/src/state/appStore';
import { radii, spacing } from '@/src/theme';

export default function CatchUpRoute() {
  const params = useLocalSearchParams<{ personId?: string }>();
  const { state, actions } = useAppStore();
  const photoRetries = useRef(new Set<string>());
  const accepted = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  const person = accepted.find(({ person }) => person.id === params.personId)?.person ?? accepted[0]?.person;
  const updates = state.server.updates.filter((update) => update.senderId === person?.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <Screen scroll contentStyle={styles.content}>
      <ScreenHeader eyebrow="Catch up" title={`${person?.displayName ?? 'Your person'} left you ${updates.length} little updates.`} subtitle="Go through them whenever you have a minute." />
      <View style={styles.strip}>
        {updates.slice(0, 3).map((update) => (
          <View key={update.id} style={styles.tile}>
            <MomentPhoto
              photo={{ uri: update.photoUrl }}
              height={104}
              radius={radii[18]}
              onLoadError={() => {
                if (photoRetries.current.has(update.id)) return;
                photoRetries.current.add(update.id);
                void actions.refreshUpdates();
              }}
            />
            <AppText variant="caption11" tone="secondary">{clockTime(update.createdAt)}</AppText>
            <AppText variant="label12" numberOfLines={1}>{update.statusText ?? 'Moment'}</AppText>
          </View>
        ))}
      </View>
      <ActionButton label="Start catch up" onPress={() => router.replace('/(tabs)/moments')} />
      <ActionButton label="Back to people" variant="secondary" onPress={() => router.replace('/(tabs)/people')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[28] },
  strip: { flexDirection: 'row', gap: spacing[12] },
  tile: { flex: 1, gap: spacing[4], minWidth: 0 },
});
