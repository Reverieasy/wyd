import { StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  eyebrow: string;
  title?: string;
  subtitle?: string;
  align?: 'left' | 'center';
  style?: ViewStyle;
};

export function ScreenHeader({ eyebrow, title, subtitle, align = 'left', style }: Props) {
  const centered = align === 'center';

  return (
    <View style={[styles.base, centered && styles.centered, style]}>
      <AppText variant="caption11" tone="secondary" style={centered && styles.centeredText}>
        {eyebrow.toUpperCase()}
      </AppText>
      {title ? (
        <AppText variant="title24" style={centered && styles.centeredText}>
          {title}
        </AppText>
      ) : null}
      {subtitle ? (
        <AppText variant="body14" tone="secondary" style={centered && styles.centeredText}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'flex-start', gap: spacing[8], width: '100%' },
  centered: { alignItems: 'center' },
  centeredText: { textAlign: 'center' },
});
