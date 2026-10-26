import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { AppText } from './primitives/AppText';
import { GradientText } from './GradientText';

export function BrandWordmark({ size = 22, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  const text = { fontFamily: 'Nunito_900Black', fontSize: size, lineHeight: size * 1.5, letterSpacing: -size * 0.025 };
  // Reserve each word's full glyph width. Shrinking a native mask can otherwise
  // clip the final “u” or question mark even while the surrounding row fits.
  return <View accessible accessibilityRole="text" accessibilityLabel="watchu doin?" style={[styles.row, { width: size * 6.5, height: size * 1.5 }, style]}>
    <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} allowFontScaling={false} style={[text, { width: size * 3.7, color: isDark ? colors.text.primary : '#150B32' }]}>watchu</AppText>
    <GradientText numberOfLines={1} allowFontScaling={false} gradientColors={['#AC6BFF', '#9556FA']} style={[text, { width: size * 2.15, textAlign: 'right' }]}>doin</GradientText>
    <View style={{ width: size * 0.65, flexShrink: 0 }}><GradientText numberOfLines={1} allowFontScaling={false} gradientColors={['#9556FA', '#8145F5']} style={[text, { width: size * 0.65, letterSpacing: 0, textAlign: 'center' }]}>?</GradientText><View pointerEvents="none" accessible={false} style={[styles.spark, { left: '50%', transform: [{ translateX: -4 }], top: size * 0.03 }]}><View style={[styles.stroke, { height: size * 0.25, backgroundColor: '#9953FF', transform: [{ rotate: '-20deg' }] }]} /><View style={[styles.stroke, { height: size * 0.25, backgroundColor: '#9953FF', transform: [{ rotate: '25deg' }] }]} /></View></View>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 }, spark: { position: 'absolute', flexDirection: 'row', gap: 4 }, stroke: { width: 2, borderRadius: 2 } });
