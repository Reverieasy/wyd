import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, spacing } from '@/src/theme';

export type MainTab = 'people' | 'activity' | 'camera' | 'moments' | 'you';

type Props = {
  activeRoute: MainTab;
  onNavigate: (route: MainTab) => void;
  hasUnreadActivity?: boolean;
};

const items: { key: MainTab; label: string; icon: ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { key: 'people', label: 'Home', icon: 'home' },
  { key: 'activity', label: 'Activity', icon: 'notifications-none' },
  { key: 'camera', label: 'Add moment', icon: 'add' },
  { key: 'moments', label: 'Moments', icon: 'history' },
  { key: 'you', label: 'You', icon: 'person-outline' },
];

export function BottomNavigation({ activeRoute, onNavigate, hasUnreadActivity = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: layout.bottomNavigationHeight + insets.bottom, paddingBottom: insets.bottom }]} pointerEvents="box-none">
      <View style={styles.pill} />
      {items.map((item) => {
        const active = activeRoute === item.key;
        const camera = item.key === 'camera';

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            key={item.key}
            onPress={() => onNavigate(item.key)}
            style={({ pressed }) => [styles.item, camera && styles.cameraItem, pressed && styles.pressed]}
          >
            <View style={camera ? styles.cameraButton : styles.iconWrap}>
              <MaterialIcons color={camera ? colors.text.onAccent : active ? colors.background.accent : colors.text.primary} name={item.icon} size={camera ? 30 : 23} />
              {item.key === 'activity' && hasUnreadActivity ? <View style={styles.badge} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    height: layout.bottomNavigationHeight,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[40],
    position: 'relative',
  },
  pill: { backgroundColor: '#FAF9FA', borderColor: '#ECE8EA', borderRadius: 27, borderWidth: 1, elevation: 5, height: 54, left: spacing[20], position: 'absolute', right: spacing[20], shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 11, top: 9 },
  item: { alignItems: 'center', height: 44, justifyContent: 'center', marginTop: spacing[4], width: 40 },
  cameraItem: { height: 52, marginTop: -spacing[10], width: 52 },
  iconWrap: { alignItems: 'center', height: 40, justifyContent: 'center', position: 'relative', width: 40 },
  cameraButton: { alignItems: 'center', backgroundColor: colors.background.accent, borderRadius: radii.full, elevation: 8, height: 52, justifyContent: 'center', shadowColor: colors.background.accent, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.34, shadowRadius: 9, width: 52 },
  badge: { backgroundColor: colors.background.accent, borderColor: '#FAF9FA', borderRadius: radii.full, borderWidth: 2, height: 10, position: 'absolute', right: 5, top: 5, width: 10 },
  pressed: { opacity: 0.7 },
});
