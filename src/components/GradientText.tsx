import { useTheme } from '@/src/theme/ThemeProvider';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { createElement, type ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { typography } from '@/src/theme';
import { AppText } from './primitives/AppText';

export function GradientText({ children, style, variant = 'title24', gradientColors, ...props }: ComponentProps<typeof AppText> & { gradientColors?: readonly [string, string, ...string[]] }) {
  const { colors, gradients } = useTheme();
  const fill = gradientColors ?? gradients.title;
  if (Platform.OS === 'web') {
    const textStyle = StyleSheet.flatten([typography[variant], style]);
    return createElement('span', { style: { ...textStyle, lineHeight: textStyle.lineHeight ? `${textStyle.lineHeight}px` : undefined, display: 'inline-block', whiteSpace: 'nowrap', backgroundImage: `linear-gradient(to right, ${fill.join(', ')})`, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' } }, children);
  }
  return <MaskedView maskElement={<AppText {...props} variant={variant} style={style}>{children}</AppText>}>
    <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <AppText {...props} variant={variant} style={[style, { opacity: 0 }]}>{children}</AppText>
    </LinearGradient>
  </MaskedView>;
}
