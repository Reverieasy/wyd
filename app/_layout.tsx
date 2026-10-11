import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { router, Stack, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { NotificationPermissionPrompt } from '@/src/components/NotificationPermissionPrompt';
import { notificationService } from '@/src/features/notifications/notificationService';
import { navigateForNotification } from '@/src/features/notifications/notificationRouter';
import type { AppNotificationData } from '@/src/features/notifications/notificationTypes';
import { AppStoreProvider, useAppStore } from '@/src/state/appStore';
import { colors } from '@/src/theme';

type PendingNotification = { identifier: string; data: AppNotificationData };

function NotificationCoordinator() {
  const { state, actions } = useAppStore();
  const navigationState = useRootNavigationState();
  const actionsRef = useRef(actions);
  const processedRef = useRef(new Set<string>());
  const previousUserRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const [pending, setPending] = useState<PendingNotification | null>(null);
  actionsRef.current = actions;

  useEffect(() => {
    const cleanup = notificationService.listen(
      (data) => void actionsRef.current.handleNotificationSignal(data),
      (identifier, data) => setPending({ identifier, data }),
    );
    const initial = notificationService.getInitialResponse();
    if (initial) {
      setPending(initial);
      void notificationService.clearInitialResponse();
    }
    return cleanup;
  }, []);

  useEffect(() => {
    const userId = state.server.session?.user.id ?? null;
    if (previousUserRef.current && previousUserRef.current !== userId) {
      processedRef.current.clear();
      setPending(null);
    }
    previousUserRef.current = userId;
  }, [state.server.session?.user.id]);

  useEffect(() => {
    const userId = state.server.session?.user.id;
    if (!pending || !userId || !state.server.profile || state.server.initializing || !navigationState?.key || processingRef.current) return;
    const key = `${userId}:${pending.identifier}`;
    if (processedRef.current.has(key)) {
      setPending(null);
      return;
    }
    processedRef.current.add(key);
    processingRef.current = true;
    const target = pending;
    setPending(null);
    void actions.prepareNotificationRoute(target.data)
      .then((available) => {
        if (available) navigateForNotification(target.data);
        else router.push(target.data.type === 'moment' || target.data.type === 'reaction' ? '/(tabs)/moments' : '/(tabs)/activity');
      })
      .finally(() => { processingRef.current = false; });
  }, [actions, navigationState?.key, pending, state.server.initializing, state.server.profile, state.server.session?.user.id]);

  return (
    <NotificationPermissionPrompt
      visible={state.server.notificationPromptVisible}
      loading={state.server.notificationsLoading}
      onEnable={() => void actions.enableNotifications()}
      onDismiss={() => void actions.dismissNotificationPrompt()}
    />
  );
}

function AppNavigator() {
  const { state } = useAppStore();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (state.server.initializing || state.server.authLinkProcessing || !navigationState?.key) return;
    const root = segments[0];
    const route = (segments as string[])[1];
    const onConfirmationScreen = root === 'email-confirmed';
    if (state.server.confirmationStatus !== 'idle') {
      if (!onConfirmationScreen) router.replace('/email-confirmed');
      return;
    }
    if (onConfirmationScreen) {
      router.replace(state.server.session ? '/(tabs)/people' : '/(onboarding)/sign-in');
      return;
    }
    if (!state.server.session) {
      if (root !== '(onboarding)') router.replace('/(onboarding)/welcome');
      return;
    }
    if (!state.server.profile) return;
    if (root === '(onboarding)' && route !== 'connect') {
      router.replace('/(tabs)/people');
    }
  }, [navigationState?.key, segments, state.server.authLinkProcessing, state.server.confirmationStatus, state.server.initializing, state.server.profile, state.server.session]);

  const loading = state.server.initializing || state.server.authLinkProcessing;
  return (
    <>
      <Stack screenOptions={{ contentStyle: styles.content, headerShown: false }} />
      {loading ? (
        <View style={[StyleSheet.absoluteFill, styles.loading]}>
          <ActivityIndicator color={colors.background.accent} />
        </View>
      ) : (
        <NotificationCoordinator />
      )}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.background.accent} />
      </View>
    );
  }

  return (
    <AppStoreProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AppStoreProvider>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background.app },
  loading: { alignItems: 'center', backgroundColor: colors.background.app, flex: 1, justifyContent: 'center' },
});
