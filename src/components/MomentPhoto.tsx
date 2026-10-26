import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { PhotoAsset } from '@/src/models';
import { radii } from '@/src/theme';
import { AppText } from './primitives/AppText';
import { environment } from '@/src/lib/environment';
import { createMomentPhotoSource } from '@/src/features/updates/photoAccess';
import { useAppStore } from '@/src/state/appStore';

type Props = { photo: PhotoAsset; height?: number; radius?: number; style?: ViewStyle; contentFit?: 'cover' | 'contain'; onSize?: (width: number, height: number) => void; onLoadError?: () => void };


export function MomentPhoto({ photo, height = 280, radius = radii[20], style, onLoadError, contentFit = 'cover', onSize }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const paletteColors = {
  accent: colors.background.accentSoft,
  love: colors.background.loveSoft,
  neutral: colors.background.subtle,
};
  const palette = photo.palette ?? 'neutral';
  const { state } = useAppStore();
  const accessToken = state.server.session?.access_token;
  const userId = state.server.session?.user.id;
  const source = useMemo(() => createMomentPhotoSource(photo.uri, accessToken, environment.supabaseUrl, environment.supabasePublishableKey), [photo.uri, accessToken]);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo.uri, accessToken]);
  return (
    <View style={[styles.base, { backgroundColor: paletteColors[palette], borderRadius: radius, height: style?.aspectRatio ? undefined : height }, style]}>
      {source && !failed ? (
        <Image key={userId ?? 'local-preview'} source={source} cachePolicy="none" transition={0} onLoad={event => onSize?.(event.source.width, event.source.height)} onError={() => { setFailed(true); onLoadError?.(); }} contentFit={contentFit} style={styles.image} />
      ) : (
        <>
          <View style={styles.focusFrame} />
          <AppText variant="label12" tone="secondary">{photo.placeholderLabel ?? 'PHOTO UNAVAILABLE'}</AppText>
          {source && failed ? <Pressable accessibilityRole="button" accessibilityLabel="Retry loading photo" onPress={() => setFailed(false)} style={styles.retry}><AppText variant="label12">Tap to retry</AppText></Pressable> : null}
        </>
      )}
    </View>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%' },
  focusFrame: { borderColor: colors.background.card, borderRadius: radii[20], borderWidth: 1, height: '72%', position: 'absolute', width: '72%' },
  image: { height: '100%', width: '100%' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
});
