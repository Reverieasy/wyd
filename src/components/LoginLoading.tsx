import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { AppText } from './primitives/AppText';
import { BrandLogo } from './BrandLogo';
import { SoftEntrance } from './SoftEntrance';
import { BrandWordmark } from './BrandWordmark';

export function LoginLoading({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  return <Modal transparent visible={visible} animationType="none" onRequestClose={() => {}}>
    <View accessibilityViewIsModal accessibilityLiveRegion="polite" style={[styles.screen, { backgroundColor: colors.background.app }]}>
      <SoftEntrance style={styles.copy}><BrandLogo size={130} /><BrandWordmark size={30} /><ActivityIndicator size="large" color={colors.background.accent} /><AppText style={styles.welcome}>Welcome</AppText><AppText tone="secondary">Getting your circle ready…</AppText></SoftEntrance>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, copy: { alignItems: 'center', gap: 20 }, welcome: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, lineHeight: 34 } });
