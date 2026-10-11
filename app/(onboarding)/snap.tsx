import { router } from 'expo-router';

import { OnboardingIllustration, OnboardingStep } from '@/src/components';

export default function SnapRoute() {
  return (
    <OnboardingStep
      step="1 OF 3"
      title="Snap your moment."
      message="No perfect photo. No long caption. Just what you're doing right now."
      hero={<OnboardingIllustration label="CAMERA" />}
      onContinue={() => router.push('/(onboarding)/nudge')}
    />
  );
}
