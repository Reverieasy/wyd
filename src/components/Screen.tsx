import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import type { ReactNode, Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps, StyleSheet, ViewStyle } from 'react-native';
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
  keyboardAvoiding?: boolean;
  scrollRef?: Ref<ScrollView>;
};

export function Screen({ children, scroll = false, dark = false, backgroundColor: customBackground, contentStyle, keyboardShouldPersistTaps, keyboardAvoiding = false, scrollRef }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const backgroundColor = customBackground ?? (dark ? colors.background.camera : colors.background.app);

  if (scroll) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor }]}>
        <ScreenTransition enabled={!dark}>
          <KeyboardAvoidingView enabled={keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
          <ScrollView
            ref={scrollRef}
            automaticallyAdjustKeyboardInsets={!keyboardAvoiding && Platform.OS === 'ios'}
            keyboardDismissMode="interactive"
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          </KeyboardAvoidingView>
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
