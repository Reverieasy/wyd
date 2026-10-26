import { MotionPressable as Pressable } from './MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';

import { radii, spacing } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
}: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {primary ? <LinearGradient colors={gradients.action} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} /> : null}
      {loading ? (
        <ActivityIndicator color={primary ? colors.text.onAccent : colors.text.primary} />
      ) : (
        <>
          {icon}
          <AppText variant="label14" numberOfLines={2} tone={primary ? 'onAccent' : 'primary'} style={styles.label}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii[18],
    overflow: 'hidden',
    flexDirection: 'row',
    gap: spacing[8],
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    alignSelf: 'stretch',
  },
  primary: { backgroundColor: colors.background.accent },
  secondary: { backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: { flexShrink: 1, textAlign: 'center' },
});
