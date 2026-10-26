import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { Modal, StyleSheet, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { AppText } from './primitives/AppText';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationDialog({ visible, title, message, confirmLabel, busy = false, error, onConfirm, onCancel }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  return <Modal transparent animationType="none" visible={visible} onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal role="dialog" aria-label={title} style={styles.dialog}>
        <AppText variant="title20" style={styles.title}>{title}</AppText>
        <AppText variant="body14" tone="secondary" style={styles.copy}>{message}</AppText>
        {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
        <ActionButton label={confirmLabel} loading={busy} onPress={onConfirm} />
        <ActionButton label="Cancel" variant="secondary" disabled={busy} onPress={onCancel} />
      </View>
    </View>
  </Modal>;
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(28,25,36,0.42)' },
  dialog: { width: '100%', maxWidth: 380, padding: 24, gap: 16, borderRadius: 22, backgroundColor: colors.background.card },
  title: { color: colors.text.heading, textAlign: 'center' }, copy: { textAlign: 'center' }, error: { color: '#B42318', fontSize: 12 },
});
