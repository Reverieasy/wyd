import { Image, StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';

export function BrandLogo({ size = 142, onLoad, onError }: { size?: number; onLoad?: ComponentProps<typeof Image>['onLoad']; onError?: ComponentProps<typeof Image>['onError'] }) {
  return <Image accessibilityLabel="watchudoin?" onLoad={onLoad} onError={onError} source={require('../../assets/figma/wyd-logo.png')} style={[styles.logo, { height: size * 2 / 3, width: size }]} />;
}

const styles = StyleSheet.create({ logo: { resizeMode: 'contain' } });
