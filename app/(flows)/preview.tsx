import { router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { ActionButton, AppText, MomentPhoto, Recipient, Screen, ScreenHeader, SettingRow, StatusChip, TextField } from '@/src/components';
import type { UpdateStatus } from '@/src/models';
import { statusDetails, useAppStore } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';

const statuses: { key: UpdateStatus; tone: 'accent' | 'neutral' | 'love' }[] = [
  { key: 'studying', tone: 'accent' },
  { key: 'home', tone: 'neutral' },
  { key: 'eating', tone: 'love' },
];

export default function PreviewRoute() {
  const { state, actions } = useAppStore();
  const draft = state.local.draft;
  const recipients = state.server.connections.filter(({ connection }) => connection.status === 'accepted').map(({ person }) => person);
  const photo = draft.photo ?? { uri: null, placeholderLabel: 'NO PHOTO YET', palette: 'neutral' as const };
  const canSend = Boolean(draft.photo && draft.recipientIds.length > 0 && state.server.profile && !draft.sending);
  const sendLabel = draft.sendStage === 'preparing' ? 'Preparing photo'
    : draft.sendStage === 'uploading' ? 'Uploading photo'
      : draft.sendStage === 'creating' ? 'Creating moment'
        : draft.error ? 'Try sending again'
          : state.server.termsStatus?.acceptedAt ? 'Send update' : 'Review terms';
  const send = async () => {
    if (!state.server.termsStatus?.acceptedAt) {
      router.push({ pathname: '/(flows)/terms', params: { returnTo: 'preview' } });
      return;
    }
    const id = await actions.sendDraft();
    if (id) router.replace('/(flows)/sent');
  };
  const retake = () => {
    actions.clearDraftPhoto();
    router.replace('/(tabs)/camera');
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.content}>
      <ScreenHeader eyebrow="Send update" />
      <MomentPhoto photo={photo} height={360} radius={radii[28]} />
      <ActionButton label="Retake or choose another" variant="secondary" disabled={draft.sending} onPress={retake} />
      <View style={styles.section}>
        <AppText variant="title20">What are you up to?</AppText>
        <View style={styles.chips}>
          {statuses.map(({ key, tone }) => <StatusChip key={key} label={`${statusDetails[key].symbol} ${statusDetails[key].label}`} tone={tone} selected={draft.status === key} onPress={() => actions.setDraftStatus(key)} />)}
        </View>
      </View>
      <View style={styles.section}>
        <AppText variant="label14">Add a caption</AppText>
        <TextField multiline maxLength={150} placeholder="Optional little note" value={draft.caption} onChangeText={actions.setDraftCaption} />
        {draft.caption.length >= 120 ? <AppText variant="caption11" tone="secondary" style={styles.counter}>{draft.caption.length}/150</AppText> : null}
      </View>
      <View style={styles.section}>
        <AppText variant="label14">Send to</AppText>
        <View style={styles.recipients}>
          {recipients.map((person) => <Recipient key={person.id} name={person.displayName} avatarUri={person.avatarUrl ?? undefined} selected={draft.recipientIds.includes(person.id)} onPress={() => actions.toggleDraftRecipient(person.id)} />)}
        </View>
        {recipients.length === 0 ? <AppText variant="body14" tone="secondary">Connect with someone before sending a moment.</AppText> : null}
      </View>
      <SettingRow
        icon="notifications-off"
        label="Send quietly"
        value="No push notification"
        control={(
          <Switch
            trackColor={{ false: colors.background.subtle, true: colors.background.accent }}
            thumbColor={colors.background.card}
            value={draft.isQuiet}
            onValueChange={actions.setDraftQuiet}
          />
        )}
      />
      {draft.error ? <AppText variant="body14" style={styles.error}>{draft.error}</AppText> : null}
      {!state.server.termsStatus?.acceptedAt ? <AppText variant="caption11" tone="secondary" style={styles.terms}>Review and accept the Terms of Use before sharing your first moment.</AppText> : null}
      <ActionButton label={sendLabel} loading={draft.sending} disabled={!canSend} onPress={() => void send()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[20], paddingBottom: spacing[32] },
  section: { gap: spacing[12] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  recipients: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  counter: { textAlign: 'right' },
  error: { color: '#A63C4B' },
  terms: { textAlign: 'center' },
});
