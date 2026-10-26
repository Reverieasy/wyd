import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Screen, ScreenHeader } from '@/src/components';
import { useResendCooldown } from '@/src/features/auth/useResendCooldown';
import { useAppStore } from '@/src/state/appStore';
import { radii, spacing } from '@/src/theme';

export default function EmailConfirmedRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const success = state.server.confirmationStatus === 'success';
  const cooldown = useResendCooldown(state.server.resendAvailableAt);

  const continueToApp = () => {
    actions.clearConfirmationFlow();
    router.replace('/(tabs)/people');
  };

  const backToSignIn = () => {
    actions.clearConfirmationFlow();
    router.replace('/(onboarding)/sign-in');
  };

  return (
    <Screen contentStyle={styles.screen}>
      <ScreenHeader eyebrow={success ? 'Confirmed' : 'Confirmation'} />
      <View style={styles.center}>
        <View style={[styles.icon, !success && styles.errorIcon]}><AppText variant="display32">{success ? '\u2713' : '!'}</AppText></View>
        <AppText variant="title24" style={styles.centerText}>{success ? 'Email confirmed' : "We couldn't confirm that link"}</AppText>
        <AppText variant="body16" tone="secondary" style={styles.centerText}>
          {success
            ? "You're all set. Now let's get you connected to the people you care about."
            : 'The confirmation link may have expired or already been used.'}
        </AppText>
        {!success && state.server.confirmationError ? <AppText variant="body14" style={styles.error}>{state.server.confirmationError}</AppText> : null}
        {!success && state.server.verificationMessage ? <AppText variant="body14" style={styles.success}>{state.server.verificationMessage}</AppText> : null}
        {!success && state.server.verificationError ? <AppText variant="body14" style={styles.error}>{state.server.verificationError}</AppText> : null}
      </View>
      <View style={styles.actions}>
        {success ? (
          <ActionButton label="Continue" onPress={continueToApp} />
        ) : (
          <>
            <ActionButton
              label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation'}
              loading={state.server.verificationBusy}
              disabled={!state.server.verificationEmail || cooldown > 0}
              onPress={() => void actions.resendSignupConfirmation()}
            />
            <ActionButton label="Back to sign in" variant="secondary" onPress={backToSignIn} />
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  center: { alignItems: 'center', gap: spacing[16] },
  icon: { alignItems: 'center', backgroundColor: colors.background.accentSoft, borderRadius: radii.full, height: 116, justifyContent: 'center', marginBottom: spacing[16], width: 116 },
  errorIcon: { backgroundColor: colors.background.loveSoft },
  centerText: { textAlign: 'center' },
  success: { color: colors.background.accent, textAlign: 'center' },
  error: { color: '#B42318', textAlign: 'center' },
  actions: { gap: spacing[12] },
});
