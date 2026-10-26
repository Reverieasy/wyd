import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, FlowHeader, Screen } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { spacing } from '@/src/theme';

const sections = [
  ['Private sharing', 'Only share photos you have the right to share. Moments are intended for people you choose, but recipients can still save or show what they receive.'],
  ['Respect and safety', 'Do not post harassment, bullying, threats, hate, sexual exploitation, non-consensual intimate content, impersonation, spam, or illegal material. Do not abuse Nudges or try to bypass privacy and safety controls.'],
  ['Moderation', 'We may review reports, restrict features, remove content, block accounts, or preserve information when needed for safety or legal compliance.'],
  ['Your account', 'You are responsible for your sign-in details and activity. You can delete your account and associated content from Privacy & account.'],
];

export default function TermsRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { state, actions } = useAppStore();
  const accepted = Boolean(state.server.termsStatus?.acceptedAt);
  const accept = async () => {
    if (await actions.acceptTerms()) {
      if (returnTo === 'preview') router.replace('/(flows)/preview');
      else router.back();
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <FlowHeader title="Terms of Use" />
      <View style={styles.intro}>
        <AppText variant="title24">Share with care.</AppText>
        <AppText variant="body14" tone="secondary">Effective September 25, 2026. These terms govern your use of watchudoin?.</AppText>
      </View>
      {sections.map(([title, body]) => (
        <View key={title} style={styles.section}>
          <AppText variant="title20">{title}</AppText>
          <AppText variant="body14" tone="secondary">{body}</AppText>
        </View>
      ))}
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      {accepted ? (
        <View style={styles.accepted}>
          <AppText variant="label14">Terms accepted</AppText>
          <AppText variant="caption11" tone="secondary">You accepted the current version.</AppText>
        </View>
      ) : (
        <ActionButton label="I agree" loading={state.server.busy} onPress={() => void accept()} />
      )}
    </Screen>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  content: { gap: spacing[24], paddingBottom: spacing[40] },
  intro: { gap: spacing[8] },
  section: { gap: spacing[8] },
  accepted: { backgroundColor: colors.background.accentSoft, borderRadius: 16, gap: spacing[4], padding: spacing[16] },
  error: { color: '#B42318' },
});
