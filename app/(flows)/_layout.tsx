import { Stack } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';

export default function FlowsLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.background.app } }} />;
}
