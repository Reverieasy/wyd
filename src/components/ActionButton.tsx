import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/src/theme';
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

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii[20],
    flexDirection: 'row',
    gap: spacing[8],
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    width: '100%',
  },
  primary: { backgroundColor: colors.background.accent },
  secondary: { backgroundColor: colors.background.subtle },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: { flexShrink: 1, textAlign: 'center' },
});
