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
  connections: boolean;
};

const defaults: NotificationPreferences = { enabled: true, moments: true, nudges: true, reactions: true, connections: true };
type NotificationsModule = typeof ExpoNotifications;
let notificationsModule: NotificationsModule | null | undefined;

function getNotificationsModule(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  if (Constants.appOwnership === 'expo' || Constants.expoGoConfig) {
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
      shouldShowBanner: true,
      shouldShowList: true,
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

export const notificationService = {
  usesSystemBanners() {
    return Platform.OS !== 'web' && Device.isDevice && Boolean(projectId()) && getNotificationsModule() !== null;
  },
  async configureChannel() {
    if (Platform.OS !== 'android') return;
    const Notifications = getNotificationsModule();
    if (!Notifications) return;
    try {
      await Notifications.setNotificationChannelAsync('watchu-doin', {
        name: 'Watchu Doin?',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 180],
        lightColor: '#6C56C7',
      });
    } catch {
      // Native notification support is unavailable until the client is rebuilt.
    }
  },

  async permissionState(): Promise<NotificationPermissionState> {
    try {
      if (Platform.OS === 'web' || !Device.isDevice) return 'unavailable';
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
      if (Platform.OS === 'web' || !Device.isDevice) return 'unavailable';
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
    const token = await Notifications.getExpoPushTokenAsync({ projectId: easProjectId });
    return token.data;
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
    const { data, error } = await getSupabase().from('notification_preferences').select('enabled,moments,nudges,reactions,connections').eq('user_id', userId).maybeSingle();
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
