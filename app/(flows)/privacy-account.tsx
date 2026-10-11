import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, FlowHeader, Screen, SettingRow } from '@/src/components';
import { spacing } from '@/src/theme';

export default function PrivacyAccountRoute() {
  return (
    <Screen scroll contentStyle={styles.content}>
      <FlowHeader title="Privacy & account" />
      <View style={styles.intro}>
        <AppText variant="title24">You stay in control.</AppText>
        <AppText variant="body14" tone="secondary">Manage who can reach you, review our policies, and control your account.</AppText>
      </View>
      <View style={styles.group}>
        <AppText variant="caption11" tone="secondary">PRIVACY & SAFETY</AppText>
        <SettingRow icon="block" label="Blocked people" onPress={() => router.push('/(flows)/blocked-users')} />
        <SettingRow icon="report-problem" label="Report a problem" onPress={() => router.push('/(flows)/report-problem')} />
      </View>
      <View style={styles.group}>
        <AppText variant="caption11" tone="secondary">LEGAL</AppText>
        <SettingRow icon="description" label="Terms of Use" onPress={() => router.push('/(flows)/terms')} />
        <SettingRow icon="privacy-tip" label="Privacy Policy" onPress={() => router.push('/(flows)/privacy-policy')} />
      </View>
      <View style={styles.group}>
        <AppText variant="caption11" tone="secondary">ACCOUNT</AppText>
        <SettingRow accent icon="delete-outline" label="Delete account" value="Permanently remove your data" onPress={() => router.push('/(flows)/delete-account')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[28], paddingBottom: spacing[40] },
  intro: { gap: spacing[8] },
  group: { gap: spacing[10] },
});
