import { Image, StyleSheet } from 'react-native';

export function BrandLogo({ size = 142 }: { size?: number }) {
  return <Image accessibilityLabel="Watchu Doin?" source={require('../../assets/figma/wyd-logo.png')} style={[styles.logo, { height: size * 2 / 3, width: size }]} />;
}

const styles = StyleSheet.create({ logo: { resizeMode: 'contain' } });
