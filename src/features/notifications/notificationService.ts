import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type * as ExpoNotifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { getSupabase } from '@/src/lib/supabase';
import { parseNotificationData, type AppNotificationData, type PushEventType } from './notificationTypes';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export type NotificationPreferences = {
  enabled: boolean;
  moments: boolean;
  nudges: boolean;
  reactions: boolean;
  comments: boolean;
  connections: boolean;
};

const defaults: NotificationPreferences = { enabled: true, moments: true, nudges: true, reactions: true, comments: true, connections: true };
type NotificationsModule = typeof ExpoNotifications;
let notificationsModule: NotificationsModule | null | undefined;

function getNotificationsModule(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  if (Constants.appOwnership === 'expo') {
    notificationsModule = null;
    return notificationsModule;
  }
  try {
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

const nativeNotifications = getNotificationsModule();
if (nativeNotifications) {
  const Notifications = nativeNotifications;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Foreground activity uses the in-app banner; Android displays remote
      // notification payloads itself while the app is backgrounded or closed.
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function projectId() {
  return Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
}

function pushConfigured() {
  return Boolean(projectId()) && (Platform.OS !== 'android' || Constants.expoConfig?.extra?.pushNotifications?.androidConfigured === true);
}

export const notificationService = {
  async configureChannel() {
    if (Platform.OS !== 'android') return;
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    try {
      await Notifications.setNotificationChannelAsync('watchudoin-updates', {
        name: 'watchudoin?',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 180],
        lightColor: '#6C56C7',
      });
    } catch {
      // Native notification support is unavailable until the client is rebuilt.
    }
  },

  async permissionState(): Promise<NotificationPermissionState> {
    try {
      if (Platform.OS === 'web' || !Device.isDevice || !pushConfigured()) return 'unavailable';
      const Notifications = getNotificationsModule();
      if (!Notifications) return 'unavailable';
      const permission = await Notifications.getPermissionsAsync();
      if (permission.granted) return 'granted';
      return permission.canAskAgain ? 'undetermined' : 'denied';
    } catch {
      return 'unavailable';
    }
  },

  async requestPermission(): Promise<NotificationPermissionState> {
    try {
      if (Platform.OS === 'web' || !Device.isDevice || !pushConfigured()) return 'unavailable';
      const Notifications = getNotificationsModule();
      if (!Notifications) return 'unavailable';
      await this.configureChannel();
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.granted) return 'granted';
      return permission.canAskAgain ? 'undetermined' : 'denied';
    } catch {
      return 'unavailable';
    }
  },

  async getExpoPushToken() {
    const Notifications = getNotificationsModule();
    if (!Notifications) throw new Error('Push notifications require a development build.');
    const easProjectId = projectId();
    if (!easProjectId) throw new Error('EAS project ID is not configured. Link this project with EAS before registering push notifications.');
    if (!pushConfigured()) throw new Error('Firebase is not configured in this app build. Install the updated Android build.');
    const token = await Notifications.getExpoPushTokenAsync({ projectId: easProjectId });
    return token.data;
  },

  listenForTokenChanges(onChange: () => void) {
    const Notifications = getNotificationsModule();
    if (!Notifications || !pushConfigured()) return () => undefined;
    try {
      const subscription = Notifications.addPushTokenListener(() => onChange());
      return () => subscription.remove();
    } catch { return () => undefined; }
  },

  listen(onReceive: (data: AppNotificationData) => void, onResponse: (identifier: string, data: AppNotificationData) => void) {
    const Notifications = getNotificationsModule();
    if (!Notifications) return () => undefined;
    let received: ReturnType<NotificationsModule['addNotificationReceivedListener']> | undefined;
    let responded: ReturnType<NotificationsModule['addNotificationResponseReceivedListener']> | undefined;
    try {
      received = Notifications.addNotificationReceivedListener((notification) => {
        const data = parseNotificationData(notification.request.content.data);
        if (data) onReceive(data);
      });
      responded = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = parseNotificationData(response.notification.request.content.data);
        if (data) onResponse(response.notification.request.identifier, data);
      });
    } catch {
      received?.remove();
      responded?.remove();
    }
    return () => {
      received?.remove();
      responded?.remove();
    };
  },

  getInitialResponse() {
    const Notifications = getNotificationsModule();
    if (!Notifications) return null;
    try {
      const response = Notifications.getLastNotificationResponse();
      if (!response) return null;
      const data = parseNotificationData(response.notification.request.content.data);
      return data ? { identifier: response.notification.request.identifier, data } : null;
    } catch {
      return null;
    }
  },

  async clearInitialResponse() {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    try {
      await Notifications.clearLastNotificationResponseAsync();
    } catch {
      // Nothing to clear when the native notification module is unavailable.
    }
  },

  async openSettings() {
    await Linking.openSettings();
  },

  async loadPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await getSupabase().from('notification_preferences').select('enabled,moments,nudges,reactions,comments,connections').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ?? defaults;
  },

  async savePreferences(userId: string, preferences: NotificationPreferences) {
    const { error } = await getSupabase().from('notification_preferences').upsert({ user_id: userId, ...preferences }, { onConflict: 'user_id' });
    if (error) throw error;
  },

  async sendPush(type: PushEventType, eventId: string) {
    const { error } = await getSupabase().functions.invoke('send-push-notification', { body: { type, eventId } });
    if (error) throw error;
  },
};
