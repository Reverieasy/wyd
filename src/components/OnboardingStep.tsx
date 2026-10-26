import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/src/theme';
import { ActionButton } from './ActionButton';
import { AppText } from './primitives/AppText';
import { Screen } from './Screen';

type Props = {
  step: string;
  title: string;
  message: string;
  hero: ReactNode;
  onContinue: () => void;
};

export function OnboardingStep({ step, title, message, hero, onContinue }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  return (
    <Screen contentStyle={styles.screen}>
      <AppText variant="caption11" tone="secondary">{step}</AppText>
      <View style={styles.hero}>{hero}</View>
      <View style={styles.copy}>
        <AppText variant="title24">{title}</AppText>
        <AppText variant="body16" tone="secondary">{message}</AppText>
      </View>
      <ActionButton label="Continue" onPress={onContinue} />
    </Screen>
  );
}

export function OnboardingIllustration({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'love' | 'accent' }) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const backgrounds = {
    neutral: colors.background.subtle,
    love: colors.background.loveSoft,
    accent: colors.background.accentSoft,
  };
  return (
    <View style={[styles.illustration, { backgroundColor: backgrounds[tone] }]}>
      <AppText variant="label12" tone="secondary" style={styles.illustrationLabel}>{label}</AppText>
    </View>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', maxHeight: 390 },
  copy: { gap: spacing[12] },
  illustration: {
    alignItems: 'center',
    borderRadius: radii[28],
    height: 330,
    justifyContent: 'center',
    width: '100%',
  },
  illustrationLabel: { textAlign: 'center' },
});
