import { Tabs } from 'expo-router';

import { BottomNavigation, type MainTab } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { BOTTOM_MENU_HEIGHT } from '@/src/components/BottomNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { state } = useAppStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hasUnreadActivity = state.server.activity.some((item) => !item.read);
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: colors.background.app, paddingBottom: BOTTOM_MENU_HEIGHT + 8 + Math.max(insets.bottom, 12) } }}
      tabBar={({ navigation, state }) => {
        const activeRoute = state.routes[state.index].name as MainTab;
        if (activeRoute === 'camera') return null;
        return (
          <BottomNavigation
            activeRoute={activeRoute}
            hasUnreadActivity={hasUnreadActivity}
            onNavigate={(route) => navigation.navigate(route)}
          />
        );
      }}
    >
      <Tabs.Screen name="people" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="camera" options={{ animation: 'none', sceneStyle: { backgroundColor: colors.background.camera, paddingBottom: 0 } }} />
      <Tabs.Screen name="moments" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
