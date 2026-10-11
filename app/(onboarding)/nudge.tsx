import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, OnboardingStep } from '@/src/components';
import { colors, radii, spacing } from '@/src/theme';

export default function NudgeRoute() {
  return (
    <OnboardingStep
      step="2 OF 3"
      title={'A tiny "what are you up to?"'}
      message="Nudge someone without starting a full conversation."
      onContinue={() => router.push('/(onboarding)/private')}
      hero={
        <View style={styles.card}>
          <AppText variant="display32">{'\u{1F44B}'}</AppText>
          <AppText variant="body16">Someone close wants a little update</AppText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: colors.background.loveSoft, borderRadius: radii[28], gap: spacing[16], padding: spacing[40] },
});
