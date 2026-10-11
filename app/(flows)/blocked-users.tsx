import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Avatar, FlowHeader, Screen } from '@/src/components';
import { safetyService } from '@/src/features/safety/safetyService';
import { readableServiceError } from '@/src/lib/serviceError';
import type { BlockedUser } from '@/src/models';
import { colors, spacing } from '@/src/theme';

export default function BlockedUsersRoute() {
  const [people, setPeople] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setPeople(await safetyService.listBlockedUsers()); setError(null); }
    catch (caught) { setError(readableServiceError(caught).message); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const confirmUnblock = (person: BlockedUser) => {
    Alert.alert(`Unblock ${person.displayName}?`, 'They will not be reconnected automatically.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', onPress: () => void safetyService.unblockUser(person.id).then(load).catch((caught) => setError(readableServiceError(caught).message)) },
    ]);
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <FlowHeader title="Blocked people" />
      {loading ? <AppText variant="body14" tone="secondary">Loading blocked people...</AppText> : null}
      {!loading && people.length === 0 ? (
        <View style={styles.empty}><AppText variant="title20">No one is blocked.</AppText><AppText variant="body14" tone="secondary">People you block will appear here.</AppText></View>
      ) : null}
      {people.map((person) => (
        <View key={person.id} style={styles.person}>
          <Avatar name={person.displayName} uri={person.avatarUrl ?? undefined} size={48} />
          <View style={styles.copy}><AppText variant="label14">{person.displayName}</AppText><AppText variant="caption11" tone="secondary">@{person.handle}</AppText></View>
          <ActionButton label="Unblock" variant="secondary" style={styles.unblock} onPress={() => confirmUnblock(person)} />
        </View>
      ))}
      {error ? <AppText variant="body14" style={styles.error}>{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[16], paddingBottom: spacing[40] },
  empty: { backgroundColor: colors.background.card, borderRadius: 16, gap: spacing[8], padding: spacing[20] },
  person: { alignItems: 'center', flexDirection: 'row', gap: spacing[12], minHeight: 64 },
  copy: { flex: 1, gap: spacing[2] },
  unblock: { height: 44, width: 108 },
  error: { color: '#B42318' },
});
