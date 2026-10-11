import type { ReactNode } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  label: string;
  value?: string;
  control?: ReactNode;
  icon?: ComponentProps<typeof MaterialIcons>['name'];
  onPress?: () => void;
  accent?: boolean;
};

export function SettingRow({ label, value, control, icon, onPress, accent = false }: Props) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {icon ? <MaterialIcons color={accent ? colors.background.accent : colors.text.primary} name={icon} size={22} /> : null}
      <View style={styles.copy}>
        <AppText variant={accent ? 'label14' : 'body14'} style={accent && styles.accent}>{label}</AppText>
        {value ? <AppText variant="caption11" tone="secondary">{value}</AppText> : null}
      </View>
      {control}
      {onPress ? <MaterialIcons color={accent ? colors.background.accent : colors.text.secondary} name="chevron-right" size={22} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radii[16],
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[10],
    width: '100%',
  },
  copy: { flex: 1, gap: spacing[2] },
  accent: { color: colors.background.accent },
  pressed: { opacity: 0.78 },
});
