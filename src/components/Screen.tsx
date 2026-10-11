import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/src/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  dark?: boolean;
  contentStyle?: ViewStyle;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

export function Screen({ children, scroll = false, dark = false, contentStyle, keyboardShouldPersistTaps }: Props) {
  const backgroundColor = dark ? colors.background.camera : colors.background.app;

  if (scroll) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor }]}>
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safe, styles.content, { backgroundColor }, contentStyle]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: spacing[24], paddingHorizontal: layout.screenPadding, paddingVertical: spacing[20] },
});
