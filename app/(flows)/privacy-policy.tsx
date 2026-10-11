import { StyleSheet, View } from 'react-native';

import { AppText, FlowHeader, Screen } from '@/src/components';
import { spacing } from '@/src/theme';

const sections = [
  ['Information we collect', 'Account details, profile information, connections, photos and captions you choose to share, reactions, nudges, device push tokens, and essential service logs.'],
  ['How we use it', 'To authenticate you, deliver private moments to selected recipients, operate safety features, send notifications you enable, prevent abuse, and maintain the service.'],
  ['Sharing and storage', 'Supabase provides authentication, database, and private file storage. Expo supports app delivery and push notifications. We do not sell personal information.'],
  ['Retention', 'Active moments expire in the product after 24 hours. Expired photo files are scheduled for deletion after a limited cleanup period. Reports may be retained for safety and legal purposes.'],
  ['Your choices', 'You can disable notifications, remove connections, block or report people, and permanently delete your account from the app.'],
  ['Contact', 'Use Report a problem in the app for privacy, account, or safety requests. A public support contact must be added before store release.'],
];

export default function PrivacyPolicyRoute() {
  return (
    <Screen scroll contentStyle={styles.content}>
      <FlowHeader title="Privacy Policy" />
      <View style={styles.intro}>
        <AppText variant="title24">Privacy is the product.</AppText>
        <AppText variant="body14" tone="secondary">Effective September 25, 2026.</AppText>
      </View>
      {sections.map(([title, body]) => (
        <View key={title} style={styles.section}>
          <AppText variant="title20">{title}</AppText>
          <AppText variant="body14" tone="secondary">{body}</AppText>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing[24], paddingBottom: spacing[40] }, intro: { gap: spacing[8] }, section: { gap: spacing[8] } });
