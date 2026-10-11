import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Screen, ScreenHeader } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';

export default function SentRoute() {
  const { state } = useAppStore();
  const update = state.server.updates.find((item) => item.id === state.server.lastSentUpdateId);
  const names = state.server.connections.filter(({ person }) => update?.recipientIds.includes(person.id)).map(({ person }) => person.displayName);
  const recipientText = names.length > 0 ? names.join(', ') : 'your people';
  return (
    <Screen contentStyle={styles.screen}>
      <ScreenHeader eyebrow="Sent" />
      <View style={styles.center}>
        <View style={styles.check}><AppText variant="display32">{'✓'}</AppText></View>
        <AppText variant="title24" style={styles.centerText}>Update sent to {recipientText}</AppText>
        <AppText variant="body16" tone="secondary" style={styles.centerText}>No need to wait around. Go back to your day.</AppText>
      </View>
      <View style={styles.actions}>
        <ActionButton label="Done" onPress={() => router.replace('/(tabs)/people')} />
        <ActionButton label="See it in Moments" variant="secondary" onPress={() => router.replace('/(tabs)/moments')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  center: { alignItems: 'center', gap: spacing[16] },
  check: { alignItems: 'center', backgroundColor: colors.background.accentSoft, borderRadius: radii.full, height: 116, justifyContent: 'center', marginBottom: spacing[16], width: 116 },
  centerText: { textAlign: 'center' },
  actions: { gap: spacing[16] },
});
