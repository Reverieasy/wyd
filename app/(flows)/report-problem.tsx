import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, FlowHeader, Screen, StatusChip, TextField } from '@/src/components';
import { safetyService } from '@/src/features/safety/safetyService';
import { readableServiceError } from '@/src/lib/serviceError';
import type { SupportCategory } from '@/src/models';
import { spacing } from '@/src/theme';

const categories: { value: SupportCategory; label: string }[] = [
  { value: 'bug', label: 'App issue' }, { value: 'account', label: 'Account' }, { value: 'safety', label: 'Safety' },
  { value: 'notification', label: 'Notifications' }, { value: 'other', label: 'Other' },
];

export default function ReportProblemRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const [category, setCategory] = useState<SupportCategory>('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const submit = async () => {
    if (message.trim().length < 10) { setError('Tell us a little more so we can help.'); return; }
    setBusy(true);
    try { await safetyService.submitSupportRequest(category, message); setSent(true); setError(null); }
    catch (caught) { setError(readableServiceError(caught).message); }
    finally { setBusy(false); }
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.content}>
      <FlowHeader title="Report a problem" />
      {sent ? (
        <View style={styles.sent}><AppText variant="title24">Thanks for telling us.</AppText><AppText variant="body14" tone="secondary">Your request was recorded. Do not include passwords or authentication codes.</AppText></View>
      ) : (
        <>
          <View style={styles.intro}><AppText variant="title24">How can we help?</AppText><AppText variant="body14" tone="secondary">Choose a category and describe the issue.</AppText></View>
          <View style={styles.categories}>{categories.map((item) => <StatusChip key={item.value} label={item.label} tone="neutral" selected={category === item.value} onPress={() => setCategory(item.value)} />)}</View>
          <TextField multiline maxLength={1000} placeholder="Describe what happened" value={message} onChangeText={setMessage} />
          {error ? <AppText variant="body14" style={styles.error}>{error}</AppText> : null}
          <ActionButton label="Send report" loading={busy} onPress={() => void submit()} />
        </>
      )}
    </Screen>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({ content: { gap: spacing[24], paddingBottom: spacing[40] }, intro: { gap: spacing[8] }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] }, sent: { backgroundColor: colors.background.accentSoft, borderRadius: 16, gap: spacing[8], padding: spacing[20] }, error: { color: '#B42318' } });
