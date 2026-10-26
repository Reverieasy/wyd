import { router } from 'expo-router';

import type { AppNotificationData } from './notificationTypes';

export function navigateForNotification(data: AppNotificationData) {
  if (data.type === 'moment' || data.type === 'reaction' || data.type === 'comment') {
    router.push({ pathname: '/(flows)/moment/[id]', params: { id: data.updateId } });
    return;
  }
  if (data.type === 'nudge') {
    router.push({
      pathname: '/(tabs)/camera',
      params: { recipient: data.senderId, nudge: data.nudgeId },
    });
    return;
  }
  if (data.type === 'connection_request') {
    router.push('/(tabs)/activity');
    return;
  }
  router.push('/(tabs)/people');
}
