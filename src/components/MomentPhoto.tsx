import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

import type { PhotoAsset } from '@/src/models';
import { colors, radii } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = { photo: PhotoAsset; height?: number; radius?: number; style?: ViewStyle; onLoadError?: () => void };

const paletteColors = {
  accent: colors.background.accentSoft,
  love: colors.background.loveSoft,
  neutral: colors.background.subtle,
};

export function MomentPhoto({ photo, height = 280, radius = radii[20], style, onLoadError }: Props) {
  const palette = photo.palette ?? 'neutral';
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo.uri]);
  return (
    <View style={[styles.base, { backgroundColor: paletteColors[palette], borderRadius: radius, height }, style]}>
      {photo.uri && !failed ? (
        <Image source={{ uri: photo.uri }} onError={() => { setFailed(true); onLoadError?.(); }} resizeMode="cover" style={styles.image} />
      ) : (
        <>
          <View style={styles.focusFrame} />
          <AppText variant="label12" tone="secondary">{photo.placeholderLabel ?? 'PHOTO UNAVAILABLE'}</AppText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%' },
  focusFrame: { borderColor: colors.background.card, borderRadius: radii[20], borderWidth: 1, height: '72%', position: 'absolute', width: '72%' },
  image: { height: '100%', width: '100%' },
});
