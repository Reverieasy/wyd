import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/src/state/appStore';
import { environment } from '@/src/lib/environment';
import { createMomentPhotoSource } from '@/src/features/updates/photoAccess';

import { radii } from '@/src/theme';
import { AppText } from './primitives/AppText';
import { FigmaArtwork, type figmaArtwork } from './FigmaArtwork';

type Props = {
  name: string;
  uri?: string;
  size?: number;
  selected?: boolean;
  style?: ViewStyle;
  palette?: number;
};

export function Avatar({ name, uri, size = 52, selected = false, style, palette = 0 }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state } = useAppStore();
  const token = state.server.session?.access_token;
  const source = useMemo(() => createMomentPhotoSource(uri ?? null, token, environment.supabaseUrl, environment.supabasePublishableKey), [uri, token]);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri, token]);
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 1)
    .toUpperCase();

  const layers: Partial<Record<number, [keyof typeof figmaArtwork, number, keyof typeof figmaArtwork, number]>> = {
    30: ['avatar30', 30, 'pink22', 22], 34: ['avatar34', 34, 'pink26', 26],
    36: ['avatar36', 36, palette % 3 === 1 ? 'pink28' : palette % 3 === 2 ? 'violet28' : 'lavender28', 28],
    40: ['avatar40', 40, 'pink32', 32],
    42: ['avatar42', 42, palette % 2 ? 'pink34' : 'lavender34', 34],
    52: ['avatar52', 52, 'pink44', 44], 82: ['avatar82', 82, 'pink74', 74],
  };
  const layer = layers[size];
  const fill48 = (['lavender48', 'violet48', 'beige48', 'green48'] as const)[palette % 4];
  return (
    <View
      accessibilityLabel={`${name} avatar`}
      style={[
        styles.base,
        { borderRadius: size / 2, height: size, width: size },
        selected && styles.selected,
        style,
      ]}
    >
      {source && !failed ? (
        <Image source={source} cachePolicy="none" transition={0} contentFit="cover" onError={() => setFailed(true)} style={styles.image} />
      ) : (
        <>
          {layer ? <><View style={styles.layer}><FigmaArtwork name={layer[0]} size={layer[1]} /></View><View style={styles.layer}><FigmaArtwork name={layer[2]} size={layer[3]} /></View></> : size === 48 ? <View style={styles.layer}><FigmaArtwork name={fill48} size={48} /></View> : null}
          <AppText variant="label12" style={[styles.initials, { fontSize: size >= 80 ? 26 : size >= 48 ? 16 : 12 }]}>{initials}</AppText>
        </>
      )}
    </View>
  );
}

const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  base: {
    alignItems: 'center',
    backgroundColor: colors.background.accentSoft,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selected: {
    borderColor: colors.border.selected,
    borderWidth: 2,
  },
  image: { height: '100%', width: '100%' },
  initials: { color: isDark ? colors.text.primary : '#3C236D' },
  layer: { position: 'absolute' },
});
