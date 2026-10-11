import type { ComponentProps } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { colors, fontFamilies, radii, spacing } from '@/src/theme';

type Props = ComponentProps<typeof TextInput>;

export function TextField({ style, ...props }: Props) {
  return (
    <TextInput
      placeholderTextColor={colors.text.secondary}
      {...props}
      style={[styles.input, props.multiline && styles.multiline, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.background.card,
    borderColor: colors.border.default,
    borderRadius: radii[18],
    borderWidth: 1,
    color: colors.text.primary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    height: 56,
    lineHeight: 20,
    paddingHorizontal: spacing[16],
  },
  multiline: { height: 84, paddingTop: spacing[16], textAlignVertical: 'top' },
});
