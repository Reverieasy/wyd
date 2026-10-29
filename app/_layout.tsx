import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { router, Stack, ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { NotificationPermissionPrompt } from '@/src/components/NotificationPermissionPrompt';
import { ForegroundNotificationBanner } from '@/src/components/ForegroundNotificationBanner';
import { FirstFriendCelebration } from '@/src/components/FirstFriendCelebration';
import { MotionProvider } from '@/src/components/MotionProvider';
import { WidgetCoordinator } from '@/src/features/widgets/WidgetCoordinator';
import { CircleInviteCoordinator } from '@/src/features/circles/CircleInviteCoordinator';
import { PersonQrCoordinator } from '@/src/features/connections/PersonQrCoordinator';
import { notificationService } from '@/src/features/notifications/notificationService';
import { navigateForNotification } from '@/src/features/notifications/notificationRouter';
import type { AppNotificationData } from '@/src/features/notifications/notificationTypes';
import { AppStoreProvider, useAppStore } from '@/src/state/appStore';

import { ThemeProvider, useTheme } from '@/src/theme/ThemeProvider';
import { setWindowBackground } from '@/src/theme/windowBackground';
import { BootPlaceholder, StartupSplash } from '@/src/components/StartupSplash';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { isDark } = useTheme();
  const { state } = useAppStore();
  const [startupFinished, setStartupFinished] = useState(false);
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.background.app, card: colors.background.card, text: colors.text.primary, border: colors.border.default, primary: colors.background.accent } };
  }, [isDark, colors]);
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (state.server.initializing || state.server.authLinkProcessing || !navigationState?.key) return;
    const root = segments[0];
    if (state.server.recoveryActive) {
      if (root !== 'reset-password') router.replace('/reset-password');
      return;
    }
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
      if (root === 'join-circle' || root === 'add-person') return;
      if ((root === '(flows)' && (route === 'terms' || route === 'privacy-policy')) || root === 'reset-password') return;
      if (root !== '(onboarding)') router.replace('/(onboarding)/welcome');
      return;
    }
    if (!state.server.profile) return;
    if (root === '(onboarding)' && route !== 'connect' && route !== 'forgot-password') {
      router.replace('/(tabs)/people');
    }
  }, [navigationState?.key, segments, state.server.authLinkProcessing, state.server.confirmationStatus, state.server.initializing, state.server.profile, state.server.session, state.server.recoveryActive]);

  const loading = state.server.initializing || state.server.authLinkProcessing;
  return (
    <NavigationThemeProvider value={navigationTheme}><View style={styles.shell}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ contentStyle: styles.content, headerShown: false, animation: 'none' }} />
      {startupFinished && !loading ? <ForegroundNotificationBanner /> : null}
      {startupFinished && !loading ? <FirstFriendCelebration /> : null}
      {startupFinished && !loading ? <WidgetCoordinator /> : null}
      {startupFinished && !loading ? <PersonQrCoordinator /> : null}
      {startupFinished && !loading ? <CircleInviteCoordinator /> : null}
      {!startupFinished ? <StartupSplash ready={!loading && Boolean(navigationState?.key)} onFinish={() => setStartupFinished(true)} /> : loading ? (
        <View style={[StyleSheet.absoluteFill, styles.loading]}>
          <ActivityIndicator color={colors.background.accent} />
        </View>
      ) : (
        <NotificationCoordinator />
      )}
    </View></NavigationThemeProvider>
  );
}

function RootContent() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  useLayoutEffect(() => { void setWindowBackground(colors.background.app).catch(() => undefined); }, [colors.background.app]);
  const [fontsLoaded, fontError] = useFonts({
    Nunito_900Black: require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'),
    Nunito_800ExtraBold: require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'),
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return <BootPlaceholder />;

  return (
    <AppStoreProvider>
      <AppNavigator />
    </AppStoreProvider>
  );
}

export default function RootLayout() {
  return <ThemeProvider><MotionProvider><RootContent /></MotionProvider></ThemeProvider>;
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background.app },
  content: { backgroundColor: colors.background.app },
  loading: { alignItems: 'center', backgroundColor: colors.background.app, flex: 1, justifyContent: 'center' },
});
