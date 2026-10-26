import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { layout, spacing } from '@/src/theme';
import { ScreenTransition } from './ScreenTransition';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  dark?: boolean;
  backgroundColor?: string;
  contentStyle?: ViewStyle;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

export function Screen({ children, scroll = false, dark = false, backgroundColor: customBackground, contentStyle, keyboardShouldPersistTaps }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const backgroundColor = customBackground ?? (dark ? colors.background.camera : colors.background.app);

  if (scroll) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor }]}>
        <ScreenTransition enabled={!dark}>
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </ScreenTransition>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safe, { backgroundColor }]}
    >
      <ScreenTransition enabled={!dark} style={[styles.content, contentStyle]}>{children}</ScreenTransition>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: spacing[24], paddingHorizontal: layout.screenPadding, paddingVertical: spacing[20] },
});
