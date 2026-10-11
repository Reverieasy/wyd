import { Tabs } from 'expo-router';

import { BottomNavigation, type MainTab } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';

export default function TabsLayout() {
  const { state } = useAppStore();
  const hasUnreadActivity = state.server.activity.some((item) => !item.read);
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
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
      <Tabs.Screen name="camera" />
      <Tabs.Screen name="moments" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
