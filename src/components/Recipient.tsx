import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { spacing } from '@/src/theme';
import { Avatar } from './Avatar';
import { AppText } from './primitives/AppText';

type Props = {
  name: string;
  avatarUri?: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Recipient({ name, avatarUri, selected = false, onPress, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      <Avatar name={name} uri={avatarUri} selected={selected} />
      <AppText variant="label12" numberOfLines={2} style={styles.name}>
        {name}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    gap: spacing[8],
    minHeight: 96,
    justifyContent: 'center',
    width: 92,
  },
  pressed: { opacity: 0.75 },
  name: { textAlign: 'center' },
});
