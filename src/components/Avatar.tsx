import { Image, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  name: string;
  uri?: string;
  size?: number;
  selected?: boolean;
  style?: ViewStyle;
};

export function Avatar({ name, uri, size = 52, selected = false, style }: Props) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <AppText variant="label12" style={styles.initials}>
          {initials}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  initials: { color: colors.background.accent },
});
