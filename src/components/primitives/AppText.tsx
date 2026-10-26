import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import type { ComponentProps } from 'react';
import { StyleSheet, Text } from 'react-native';

import { typography, type TypographyVariant } from '@/src/theme';

type Props = ComponentProps<typeof Text> & {
  variant?: TypographyVariant;
  tone?: 'primary' | 'secondary' | 'onAccent';
};

export function AppText({
  variant = 'body14',
  tone = 'primary',
  style,
  ...props
}: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  return (
    <Text
      {...props}
      style={[typography[variant], styles.base, { color: colors.text[tone] }, style]}
    />
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  base: { letterSpacing: 0 },
});
