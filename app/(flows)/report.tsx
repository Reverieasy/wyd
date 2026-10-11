import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, FlowHeader, Screen, StatusChip, TextField } from '@/src/components';
import { safetyService } from '@/src/features/safety/safetyService';
import { readableServiceError } from '@/src/lib/serviceError';
import type { ReportReason } from '@/src/models';
import { useAppStore } from '@/src/state/appStore';
import { spacing } from '@/src/theme';

const reasons: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment' }, { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam' }, { value: 'impersonation', label: 'Impersonation' },
  { value: 'threats', label: 'Threats' }, { value: 'other', label: 'Something else' },
];

export default function ReportRoute() {
  const { userId, updateId, name } = useLocalSearchParams<{ userId?: string; updateId?: string; name?: string }>();
  const { actions } = useAppStore();
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!userId && !updateId) return;
    setBusy(true);
    try {
      if (updateId) await safetyService.reportMoment(updateId, reason, details);
      else if (userId) await safetyService.reportUser(userId, reason, details);
      if (userId) {
        Alert.alert('Report sent', 'Thank you. You can also block this person now.', [
          { text: 'Done', onPress: () => router.back() },
          { text: 'Block', style: 'destructive', onPress: () => void actions.blockUser(userId).then(() => router.replace('/(tabs)/people')) },
        ]);
      } else {
        Alert.alert('Report sent', 'Thank you. We will review it.', [{ text: 'Done', onPress: () => router.back() }]);
      }
    } catch (caught) { setError(readableServiceError(caught).message); }
    finally { setBusy(false); }
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.content}>
      <FlowHeader title="Report" />
      <View style={styles.intro}><AppText variant="title24">Tell us what happened.</AppText><AppText variant="body14" tone="secondary">{name ? `Your report about ${name} is private.` : 'Your report is private and will not be shown to the other person.'}</AppText></View>
      <View style={styles.reasons}>{reasons.map((item) => <StatusChip key={item.value} label={item.label} tone="neutral" selected={reason === item.value} onPress={() => setReason(item.value)} />)}</View>
      <View style={styles.field}><AppText variant="label14">Details (optional)</AppText><TextField multiline maxLength={500} placeholder="Add context that may help us review this" value={details} onChangeText={setDetails} /></View>
      {error ? <AppText variant="body14" style={styles.error}>{error}</AppText> : null}
      <ActionButton label="Submit report" loading={busy} onPress={() => void submit()} />
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing[24], paddingBottom: spacing[40] }, intro: { gap: spacing[8] }, reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }, field: { gap: spacing[8] }, error: { color: '#B42318' } });
