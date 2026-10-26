import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '@/src/state/appStore';
import { widgetService } from './widgetService';
import { useTheme } from '@/src/theme/ThemeProvider';

export function WidgetCoordinator() {
  const { state } = useAppStore();
  const { mode } = useTheme();
  const userId = state.server.session?.user.id ?? null;
  const previousUser = useRef(userId);
  const updateKey = state.server.updates.filter(update => update.senderId !== userId).map(update => `${update.id}:${update.expiresAt}`).join('|');
  const peopleKey = state.server.connections.map(entry => `${entry.person.id}:${entry.connection.status}:${entry.person.displayName}`).join('|');
  useEffect(() => {
    if (!widgetService.isAvailable()) return;
    if (!userId || previousUser.current !== userId) void widgetService.clear().catch(() => undefined);
    previousUser.current = userId;
    if (!userId || state.server.updatesLoading) return;
    const timer = setTimeout(() => void widgetService.refresh().catch(() => undefined), 700);
    return () => clearTimeout(timer);
  }, [userId, updateKey, peopleKey, state.server.updatesLoading, mode]);
  useEffect(() => {
    if (!widgetService.isAvailable()) return;
    const listener = AppState.addEventListener('change', value => { if (value === 'active') void widgetService.refresh().catch(() => undefined); });
    return () => listener.remove();
  }, []);
  return null;
}
