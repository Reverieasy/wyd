import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Avatar, FlowHeader, Screen, SettingRow } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { spacing } from '@/src/theme';

export default function PersonSettingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useAppStore();
  const entry = state.server.connections.find(({ person }) => person.id === id);
  if (!entry) return <Screen><FlowHeader title="Connection" /><AppText variant="body14" tone="secondary">This connection is no longer available.</AppText></Screen>;
  const { person, connection } = entry;

  const remove = () => Alert.alert(`Remove ${person.displayName}?`, 'You will no longer see each other’s private moments.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => void actions.removeConnection(connection.id).then((done) => { if (done) router.replace('/(tabs)/people'); }) },
  ]);
  const block = () => Alert.alert(`Block ${person.displayName}?`, 'This removes the connection and prevents new requests or interactions.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Block', style: 'destructive', onPress: () => void actions.blockUser(person.id).then((done) => { if (done) router.replace('/(tabs)/people'); }) },
  ]);

  return (
    <Screen scroll contentStyle={styles.content}>
      <FlowHeader title="Connection" />
      <View style={styles.profile}><Avatar name={person.displayName} uri={person.avatarUrl ?? undefined} size={80} /><AppText variant="title24">{person.displayName}</AppText><AppText variant="body14" tone="secondary">@{person.handle}</AppText></View>
      <View style={styles.group}>
        <SettingRow icon="report-problem" label="Report person" onPress={() => router.push({ pathname: '/(flows)/report', params: { userId: person.id, name: person.displayName } })} />
        <SettingRow accent icon="person-remove" label="Remove connection" onPress={remove} />
        <SettingRow accent icon="block" label="Block person" onPress={block} />
      </View>
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing[24], paddingBottom: spacing[40] }, profile: { alignItems: 'center', gap: spacing[4] }, group: { gap: spacing[10] }, error: { color: '#B42318' } });
