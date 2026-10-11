import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Screen, ScreenHeader } from '@/src/components';
import { colors, radii, spacing } from '@/src/theme';

export default function WelcomeRoute() {
  return (
    <Screen contentStyle={styles.screen}>
      <ScreenHeader eyebrow="Welcome" />
      <View style={styles.mark} />
      <View style={styles.copy}>
        <AppText variant="display32">Little moments,{`\n`}your people.</AppText>
        <AppText variant="body16" tone="secondary">Stay close without needing to talk all day.</AppText>
      </View>
      <ActionButton label="Get started" onPress={() => router.push('/(onboarding)/snap')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  mark: { alignSelf: 'center', backgroundColor: colors.background.accentSoft, borderRadius: radii.full, height: 210, marginTop: spacing[40], width: 210 },
  copy: { gap: spacing[12], marginTop: 'auto', marginBottom: spacing[40] },
});
