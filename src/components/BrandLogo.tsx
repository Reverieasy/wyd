import { Image, StyleSheet } from 'react-native';

export function BrandLogo({ size = 92 }: { size?: number }) {
  return <Image accessibilityLabel="Watchu Doin?" source={require('../../assets/brand-logo.png')} style={[styles.logo, { height: size, width: size }]} />;
}

const styles = StyleSheet.create({ logo: { resizeMode: 'contain' } });
