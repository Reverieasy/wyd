import type { ComponentProps } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/src/theme';

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
  return (
    <Text
      {...props}
      style={[typography[variant], styles.base, { color: colors.text[tone] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { letterSpacing: 0 },
});
