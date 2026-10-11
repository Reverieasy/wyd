import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, OnboardingStep } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';

export default function PrivateRoute() {
  const { actions } = useAppStore();
  return (
    <OnboardingStep
      step="3 OF 3"
      title="Only your people."
      message="Every update stays private and is sent only to the people you choose. No public feed, no follower counts."
      onContinue={() => {
        actions.completeOnboarding();
        router.push('/(onboarding)/sign-in');
      }}
      hero={
        <View style={styles.hero}>
          <View style={styles.lock}><AppText variant="display32">{'\u{1F512}'}</AppText></View>
          <AppText variant="body16" style={styles.center}>Private by default.</AppText>
          <AppText variant="body14" tone="secondary" style={styles.center}>You decide who gets each little update.</AppText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', backgroundColor: colors.background.accentSoft, borderRadius: radii[28], gap: spacing[8], padding: spacing[28] },
  lock: { alignItems: 'center', backgroundColor: colors.background.card, borderRadius: radii.full, height: 84, justifyContent: 'center', marginBottom: spacing[12], width: 84 },
  center: { textAlign: 'center' },
});
