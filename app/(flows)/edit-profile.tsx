import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Avatar, FlowHeader, Screen, TextField } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { spacing } from '@/src/theme';

export default function EditProfileRoute() {
  const { state, actions } = useAppStore();
  const profile = state.server.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.handle ?? '');
  useEffect(() => { actions.clearServerFeedback(); }, []);
  if (!profile) return null;

  const save = async () => {
    if (await actions.updateProfile({ displayName, username })) router.back();
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.content}>
      <FlowHeader title="Edit profile" />
      <View style={styles.avatar}><Avatar name={displayName || profile.displayName} uri={profile.avatarUrl ?? undefined} size={88} /></View>
      <View style={styles.field}><AppText variant="label14">Name</AppText><TextField autoCapitalize="words" maxLength={40} value={displayName} onChangeText={setDisplayName} /></View>
      <View style={styles.field}><AppText variant="label14">Username</AppText><TextField autoCapitalize="none" autoCorrect={false} maxLength={24} value={username} onChangeText={setUsername} /></View>
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      <ActionButton label="Save profile" loading={state.server.busy} onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing[24], paddingBottom: spacing[40] }, avatar: { alignItems: 'center' }, field: { gap: spacing[8] }, error: { color: '#B42318' } });
