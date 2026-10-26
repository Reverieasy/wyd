import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/src/theme';
import { ActionButton } from './ActionButton';
import { AppText } from './primitives/AppText';

type Props = {
  visible: boolean;
  loading?: boolean;
  onEnable: () => void;
  onDismiss: () => void;
};

export function NotificationPermissionPrompt({ visible, loading = false, onEnable, onDismiss }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.icon}>
            <MaterialIcons color={colors.background.accent} name="notifications-none" size={30} />
          </View>
          <View style={styles.copy}>
            <AppText variant="title24" style={styles.center}>Stay in the loop</AppText>
            <AppText variant="body14" tone="secondary" style={styles.center}>Get notified when your people send a moment or nudge you.</AppText>
          </View>
          <View style={styles.actions}>
            <ActionButton label="Turn on notifications" loading={loading} onPress={onEnable} />
            <ActionButton label="Not now" variant="secondary" disabled={loading} onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(28, 25, 36, 0.42)', flex: 1, justifyContent: 'center', padding: spacing[24] },
  dialog: { backgroundColor: colors.background.card, borderRadius: radii[20], gap: spacing[20], maxWidth: 380, padding: spacing[24], width: '100%' },
  icon: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.background.accentSoft, borderRadius: radii.full, height: 60, justifyContent: 'center', width: 60 },
  copy: { gap: spacing[8] },
  center: { textAlign: 'center' },
  actions: { gap: spacing[10] },
});
