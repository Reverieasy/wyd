import { MotionPressable as Pressable } from './MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import type { ReactNode } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { cardShadow, radii, spacing } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  label: string;
  value?: string;
  control?: ReactNode;
  icon?: ComponentProps<typeof MaterialIcons>['name'];
  onPress?: () => void;
  accent?: boolean;
  variant?: 'default' | 'profile';
};

export function SettingRow({ label, value, control, icon, onPress, accent = false, variant = 'default' }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, variant === 'profile' && styles.profileRow, pressed && styles.pressed]}>
      {icon ? variant === 'profile' ? <View style={styles.profileIcon}><MaterialIcons color={colors.background.accent} name={icon} size={24} /></View> : <MaterialIcons color={accent ? colors.background.accent : colors.text.heading} name={icon} size={20} style={{ marginRight: 16 }} /> : null}
      <View style={styles.copy}>
        <AppText variant="label12" style={[accent && styles.accent, variant === 'profile' && styles.profileLabel]}>{label}</AppText>
        {value ? <AppText variant="caption11" tone="secondary">{value}</AppText> : null}
      </View>
      {control}
      {onPress ? <MaterialIcons color={accent ? colors.background.accent : colors.text.secondary} name="chevron-right" size={22} /> : null}
    </Pressable>
  );
}

const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    ...cardShadow,
    borderRadius: radii[16],
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[10],
    width: '100%',
  },
  copy: { flex: 1, gap: spacing[2] },
  accent: { color: colors.background.accent },
  pressed: { opacity: 0.78 },
  profileRow: { borderWidth: 0, borderRadius: 16, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, shadowOpacity: 0, elevation: 0, boxShadow: '0px 5px 18px rgba(35, 18, 57, 0.045)' },
  profileIcon: { width: 38, height: 38, borderRadius: 13, marginRight: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? colors.background.accentSoft : '#F5EFFF' },
  profileLabel: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, lineHeight: 21, color: isDark ? colors.text.primary : '#150B32' },
});
