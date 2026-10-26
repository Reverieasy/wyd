import { MotionPressable as Pressable } from './MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './primitives/AppText';

export type MainTab = 'people' | 'activity' | 'camera' | 'moments' | 'you';
export const BOTTOM_MENU_HEIGHT = 66;
const items: { key: MainTab; label: string; icon: ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'people', label: 'Home', icon: 'home' }, { key: 'activity', label: 'Activity', icon: 'bell' },
  { key: 'camera', label: 'Camera', icon: 'camera' }, { key: 'moments', label: 'Moments', icon: 'image' }, { key: 'you', label: 'You', icon: 'user' },
];
export function BottomNavigation({ activeRoute, onNavigate, hasUnreadActivity = false }: { activeRoute: MainTab; onNavigate: (route: MainTab) => void; hasUnreadActivity?: boolean }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
    <View style={styles.bar}>{items.map(({ key, label, icon }) => {
      const active = activeRoute === key;
      const add = key === 'camera';
      const color = active ? colors.background.accent : colors.text.secondary;
      return <Pressable key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => onNavigate(key)} style={({ pressed }) => [styles.item, active && !add && styles.activeItem, add && styles.add, pressed && { opacity: 0.7 }]}>
        {add ? <View pointerEvents="none" style={styles.addButton}><Feather color="white" name="camera" size={27} /></View> : <>{key === 'people' && active ? <MaterialIcons color={color} name="home" size={26} /> : <Feather color={color} name={icon} size={23} />}<AppText variant="caption11" style={[styles.label, { color }]}>{label}</AppText>{active ? <View style={[styles.activeDot, { backgroundColor: color }]} /> : null}{key === 'activity' && hasUnreadActivity ? <View style={styles.badge} /> : null}</>}
      </Pressable>;
    })}</View>
  </View>;
}
const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, paddingHorizontal: 16, backgroundColor: 'transparent' },
  bar: { alignSelf: 'center', width: '100%', maxWidth: 568, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: BOTTOM_MENU_HEIGHT, paddingHorizontal: 6, backgroundColor: colors.background.card, borderWidth: 1, borderColor: isDark ? colors.border.default : '#EEEAF7', borderRadius: 30, boxShadow: '0px 5px 22px rgba(38, 20, 75, 0.06)' },
  item: { alignItems: 'center', justifyContent: 'center', minHeight: 54, flex: 1, gap: 2, paddingBottom: 4, borderRadius: 25 }, activeItem: { backgroundColor: isDark ? colors.background.accentSoft : '#F7F0FF' },
  label: { fontSize: 10, lineHeight: 14, fontFamily: 'PlusJakartaSans_500Medium' }, add: { height: 60, paddingBottom: 0 },
  addButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#6C24FF', borderWidth: 2, borderColor: isDark ? colors.border.default : '#EFE6FF', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 3px 12px rgba(108, 36, 255, 0.18)' },
  activeDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2 },
  badge: { position: 'absolute', right: 16, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.background.accent },
});
