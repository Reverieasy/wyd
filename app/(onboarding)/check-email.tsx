import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Screen } from '@/src/components';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { useResendCooldown } from '@/src/features/auth/useResendCooldown';
import { useAppStore } from '@/src/state/appStore';
import { radii, spacing } from '@/src/theme';

export default function CheckEmailRoute() {
  const { styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const cooldown = useResendCooldown(state.server.resendAvailableAt);
  const email = state.server.verificationEmail;

  const backToSignIn = () => {
    actions.clearConfirmationFlow();
    router.replace('/(onboarding)/sign-in');
  };

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.brand}><BrandWordmark size={24} /></View>
      <View style={styles.center}>
        <AppText accessibilityRole="header" style={styles.title}>Check your email</AppText>
        <AppText variant="body16" tone="secondary" style={styles.centerText}>{email ? 'We sent a confirmation link to' : 'We sent you a confirmation link.'}</AppText>
        {email ? <View style={styles.emailCard}><AppText selectable variant="label14" style={styles.email}>{email}</AppText></View> : null}
        <AppText variant="body16" tone="secondary" style={styles.centerText}>Open the link to finish setting up your account.</AppText>
        <AppText variant="body14" tone="secondary" style={styles.hint}>Can’t find it? Check your spam or junk folder.</AppText>
        {state.server.verificationMessage ? <AppText accessibilityLiveRegion="polite" variant="body14" style={styles.success}>{state.server.verificationMessage}</AppText> : null}
        {state.server.verificationError ? <AppText accessibilityRole="alert" variant="body14" style={styles.error}>{state.server.verificationError}</AppText> : null}
      </View>
      <View style={styles.actions}>
        <ActionButton
          label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          variant="secondary"
          loading={state.server.verificationBusy}
          disabled={!email || cooldown > 0}
          onPress={() => void actions.resendSignupConfirmation()}
        />
        <Pressable accessibilityRole="button" onPress={backToSignIn} style={styles.back}><AppText variant="label14" tone="secondary">Back to sign in</AppText></Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  screen: { flexGrow: 1, gap: spacing[24], paddingTop: 32, paddingBottom: 32 },
  brand: { alignItems: 'center', paddingVertical: spacing[8] },
  center: { flex: 1, width: '100%', maxWidth: 440, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', gap: spacing[16], paddingVertical: 40 },
  title: { fontFamily: 'Nunito_900Black', fontSize: 32, lineHeight: 40, textAlign: 'center', marginBottom: spacing[8] },
  centerText: { textAlign: 'center' },
  emailCard: { maxWidth: '100%', backgroundColor: colors.background.card, borderRadius: radii[14], borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing[16], paddingVertical: spacing[12] },
  email: { textAlign: 'center', flexShrink: 1 },
  hint: { textAlign: 'center', marginTop: spacing[8] },
  success: { color: colors.background.accent, textAlign: 'center' },
  error: { color: isDark ? '#FFA8B5' : '#B42318', textAlign: 'center' },
  actions: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: spacing[12] },
  back: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});
