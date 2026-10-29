import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActionButton, AppText, BrandLogo, Screen } from '@/src/components';
import { BrandWordmark } from '@/src/components/BrandWordmark';


export default function WelcomeRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const width = useWindowDimensions().width;
  return <Screen scroll contentStyle={styles.screen}>
    <View style={styles.brand}><BrandLogo size={Math.min(250, width - 88)} /><BrandWordmark size={Math.min(32, (width - 72) / 6.5)} /><AppText style={styles.subtitle}>Your last 30 days together.</AppText></View>
    <View style={styles.actions}><ActionButton emphasis="gradient" label="Get started" onPress={() => router.push('/(onboarding)/create-account')} /><ActionButton label="I already have an account" variant="secondary" onPress={() => router.push('/(onboarding)/sign-in')} /><AppText style={styles.tagline}>LITTLE UPDATES. BIGGER CONNECTIONS.</AppText></View>
  </Screen>;
}
const makeStyles = ({ colors }: Theme) => StyleSheet.create({ screen: { flexGrow: 1, justifyContent: 'center', gap: 72, paddingHorizontal: 32, paddingTop: 56, paddingBottom: 48, width: '100%', maxWidth: 440, alignSelf: 'center' }, brand: { alignItems: 'center', gap: 8 }, subtitle: { fontSize: 13, lineHeight: 21, color: colors.text.secondary, textAlign: 'center' }, actions: { gap: 10 }, tagline: { marginTop: 4, fontSize: 9, textAlign: 'center', color: colors.background.accent, fontFamily: 'PlusJakartaSans_700Bold' } });
