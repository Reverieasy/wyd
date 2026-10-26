import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { GradientText } from './GradientText';

export function BrandWordmark({ size = 22, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  const text = { fontFamily: 'Nunito_900Black', fontSize: size, lineHeight: size * 1.5, letterSpacing: -size * 0.025 };
  const ink = isDark ? colors.text.primary : '#150B32';
  // A single text run joins the two words without a reserved inter-word gap.
  return <View accessible accessibilityRole="text" accessibilityLabel="watchudoin?" style={[styles.row, { width: size * 6.2, height: size * 1.5 }, style]}>
    <GradientText numberOfLines={1} allowFontScaling={false} gradientColors={[ink, ink, '#AC6BFF', '#9556FA']} gradientLocations={[0, 0.63, 0.64, 1]} style={[text, { width: size * 5.55, textAlign: 'right' }]}>watchudoin</GradientText>
    <View style={{ width: size * 0.65, flexShrink: 0 }}><GradientText numberOfLines={1} allowFontScaling={false} gradientColors={['#9556FA', '#8145F5']} style={[text, { width: size * 0.65, letterSpacing: 0, textAlign: 'center' }]}>?</GradientText><View pointerEvents="none" accessible={false} style={[styles.spark, { left: '50%', transform: [{ translateX: -4 }], top: size * 0.03 }]}><View style={[styles.stroke, { height: size * 0.25, backgroundColor: '#9953FF', transform: [{ rotate: '-20deg' }] }]} /><View style={[styles.stroke, { height: size * 0.25, backgroundColor: '#9953FF', transform: [{ rotate: '25deg' }] }]} /></View></View>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 }, spark: { position: 'absolute', flexDirection: 'row', gap: 4 }, stroke: { width: 2, borderRadius: 2 } });
