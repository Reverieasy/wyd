import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ActionButton, AppText, FlowHeader, Screen } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';

export default function WidgetReplyRoute() {
  const { owner, person } = useLocalSearchParams<{ owner?: string; person?: string }>();
  const { state, actions } = useAppStore();
  const { colors } = useTheme();
  const attempted = useRef(false);
  const [result, setResult] = useState<'waiting' | 'ready' | 'unavailable'>('waiting');
  useEffect(() => {
    if (attempted.current || state.server.initializing || !state.server.profile) return;
    attempted.current = true;
    setResult(typeof owner === 'string' && typeof person === 'string' && actions.prepareWidgetReply(owner, person) ? 'ready' : 'unavailable');
  }, [actions, owner, person, state.server.initializing, state.server.profile]);

  if (result === 'ready') return <Redirect href="/(tabs)/camera" />;
  if (result === 'waiting') return <Screen contentStyle={{ justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={colors.background.accent} accessibilityLabel="Opening reply camera" /></Screen>;
  return <Screen><FlowHeader title="Send yours" /><AppText>We couldn’t open this reply. Make sure you’re signed into the widget’s account, the person is still in your Close People, and your current moment has finished sending.</AppText><ActionButton label="Back to home" onPress={() => router.replace('/(tabs)/people')} /></Screen>;
}
