export const MOMENT_WIDGET_NAME = 'WydMoment';
export type WidgetSettings = { enabled: boolean; personId: string | null };
export type WidgetSnapshot = {
  ownerId: string | null;
  personId: string | null;
  name: string;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  updateId: string | null;
  photoData: `data:image${string}` | null;
  mode: 'moment' | 'waiting' | 'setup' | 'signed-out' | 'unavailable';
};
export const defaultWidgetSettings: WidgetSettings = { enabled: false, personId: null };

export function emptyWidget(mode: WidgetSnapshot['mode'] = 'setup'): WidgetSnapshot {
  return { ownerId: null, personId: null, name: 'watchudoin?', status: mode === 'signed-out' ? 'Sign in to see your person' : mode === 'unavailable' ? 'Open the app to refresh' : 'Choose your close person', createdAt: null, expiresAt: null, updateId: null, photoData: null, mode };
}

export function isCurrentWidgetPhoto(snapshot: WidgetSnapshot, userId: string | null, now = Date.now()) {
  return Boolean(userId && snapshot.ownerId === userId && snapshot.mode === 'moment' && snapshot.expiresAt && Date.parse(snapshot.expiresAt) > now && snapshot.updateId);
}

export function widgetTime(createdAt: string | null, now = Date.now()) {
  if (!createdAt) return 'Waiting for a photo';
  const age = Math.max(0, now - Date.parse(createdAt));
  if (!Number.isFinite(age)) return 'Open to refresh';
  const minutes = Math.floor(age / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

export function widgetStatus(status: string | null | undefined) {
  const text = status || 'A little moment';
  const emoji: Record<string, string> = { studying: '📚', chilling: '☕', working: '💻', eating: '🍽️', home: '🏡', school: '🎒', morning: '☀️' };
  return emoji[text.toLowerCase()] ? `${text} ${emoji[text.toLowerCase()]}` : text;
}

export function widgetMomentUri(snapshot: WidgetSnapshot) {
  return snapshot.updateId && isCurrentWidgetPhoto(snapshot, snapshot.ownerId)
    ? `watchudoin://moment/${encodeURIComponent(snapshot.updateId)}`
    : 'watchudoin://widget-settings';
}
