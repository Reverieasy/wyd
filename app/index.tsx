import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAppStore } from '@/src/state/appStore';


export default function Index() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state } = useAppStore();
  const { initializing, authLinkProcessing, recoveryActive, confirmationStatus, session } = state.server;

  if (initializing || authLinkProcessing) {
    return <View style={styles.loading}><ActivityIndicator accessibilityLabel="Loading Wyd" color={colors.background.accent} /></View>;
  }

  if (recoveryActive) return <Redirect href="/reset-password" />;
  if (confirmationStatus !== 'idle') return <Redirect href="/email-confirmed" />;
  return <Redirect href={session ? '/(tabs)/people' : '/(onboarding)/welcome'} />;
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.app },
});
