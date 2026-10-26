import { MotionPressable as Pressable } from './MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { StyleSheet, ViewStyle } from 'react-native';

import { radii, spacing } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  label: string;
  tone?: 'accent' | 'neutral' | 'love';
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};


export function StatusChip({ label, tone = 'accent', selected, onPress, style }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const toneColors = {
  accent: colors.background.accentSoft,
  neutral: colors.background.subtle,
  love: colors.background.loveSoft,
};
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: toneColors[tone] },
        pressed && styles.pressed,
        style,
        selected && styles.selected,
      ]}
    >
      <AppText variant="label12" style={selected ? { color: colors.text.onAccent } : undefined}>{label}</AppText>
    </Pressable>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.full,
    minHeight: 44,
    justifyContent: 'center',
    minWidth: 90,
    borderColor: colors.border.default,
    borderWidth: 1,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  selected: { borderColor: colors.border.selected, backgroundColor: gradients.action[0] },
  pressed: { opacity: 0.8 },
});
