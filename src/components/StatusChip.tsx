import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  label: string;
  tone?: 'accent' | 'neutral' | 'love';
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

const toneColors = {
  accent: colors.background.accentSoft,
  neutral: colors.background.subtle,
  love: colors.background.loveSoft,
};

export function StatusChip({ label, tone = 'accent', selected, onPress, style }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: toneColors[tone] },
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppText variant="label12">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.full,
    minHeight: 44,
    justifyContent: 'center',
    minWidth: 108,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  selected: { borderColor: colors.border.selected, borderWidth: 2 },
  pressed: { opacity: 0.8 },
});
