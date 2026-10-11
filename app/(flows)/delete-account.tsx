import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, FlowHeader, Screen, TextField } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { colors, spacing } from '@/src/theme';

export default function DeleteAccountRoute() {
  const { state, actions } = useAppStore();
  const [confirmation, setConfirmation] = useState('');
  const ready = confirmation === 'DELETE' && !state.server.busy;
  const remove = async () => {
    if (await actions.deleteAccount(confirmation)) router.replace('/(onboarding)/welcome');
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.content}>
      <FlowHeader title="Delete account" />
      <View style={styles.warning}>
        <AppText variant="title24">This cannot be undone.</AppText>
        <AppText variant="body14" tone="secondary">Your profile, connections, moments, reactions, nudges, push tokens, invites, and stored photos will be permanently removed.</AppText>
      </View>
      <View style={styles.field}>
        <AppText variant="label14">Type DELETE to confirm</AppText>
        <TextField autoCapitalize="characters" autoCorrect={false} value={confirmation} onChangeText={setConfirmation} />
      </View>
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      <ActionButton label="Permanently delete account" loading={state.server.busy} disabled={!ready} onPress={() => void remove()} />
      <ActionButton label="Keep my account" variant="secondary" disabled={state.server.busy} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[24], paddingBottom: spacing[40] },
  warning: { backgroundColor: colors.background.loveSoft, borderRadius: 16, gap: spacing[8], padding: spacing[20] },
  field: { gap: spacing[8] },
  error: { color: '#B42318' },
});
