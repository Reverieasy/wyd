import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Screen, ScreenHeader } from '@/src/components';
import { useResendCooldown } from '@/src/features/auth/useResendCooldown';
import { useAppStore } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';

export default function CheckEmailRoute() {
  const { state, actions } = useAppStore();
  const [mailError, setMailError] = useState<string | null>(null);
  const cooldown = useResendCooldown(state.server.resendAvailableAt);
  const email = state.server.verificationEmail;

  const openEmail = async () => {
    setMailError(null);
    try {
      const supported = await Linking.canOpenURL('mailto:');
      if (!supported) throw new Error('unsupported');
      await Linking.openURL('mailto:');
    } catch {
      setMailError('No email app is available on this device.');
    }
  };

  const backToSignIn = () => {
    actions.clearConfirmationFlow();
    router.replace('/(onboarding)/sign-in');
  };

  return (
    <Screen contentStyle={styles.screen}>
      <ScreenHeader eyebrow="Almost there" />
      <View style={styles.center}>
        <View style={styles.icon}><AppText variant="display32">@</AppText></View>
        <AppText variant="title24" style={styles.centerText}>Check your email</AppText>
        <AppText variant="body16" tone="secondary" style={styles.centerText}>We sent a confirmation link to your email. Tap it to finish setting up your account.</AppText>
        {email ? <AppText variant="label14" style={styles.email}>{email}</AppText> : null}
        {state.server.verificationMessage ? <AppText variant="body14" style={styles.success}>{state.server.verificationMessage}</AppText> : null}
        {state.server.verificationError || mailError ? <AppText variant="body14" style={styles.error}>{state.server.verificationError ?? mailError}</AppText> : null}
      </View>
      <View style={styles.actions}>
        <ActionButton label="Open email app" onPress={() => void openEmail()} />
        <ActionButton
          label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          variant="secondary"
          loading={state.server.verificationBusy}
          disabled={!email || cooldown > 0}
          onPress={() => void actions.resendSignupConfirmation()}
        />
        <ActionButton label="Back to sign in" variant="secondary" onPress={backToSignIn} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  center: { alignItems: 'center', gap: spacing[16] },
  icon: { alignItems: 'center', backgroundColor: colors.background.accentSoft, borderRadius: radii.full, height: 104, justifyContent: 'center', marginBottom: spacing[8], width: 104 },
  centerText: { textAlign: 'center' },
  email: { backgroundColor: colors.background.card, borderRadius: radii[14], paddingHorizontal: spacing[16], paddingVertical: spacing[10] },
  success: { color: colors.background.accent, textAlign: 'center' },
  error: { color: '#B42318', textAlign: 'center' },
  actions: { gap: spacing[12] },
});
