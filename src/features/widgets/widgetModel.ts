export const MOMENT_WIDGET_NAME = 'WydSmall';
export const widgetDesigns = ['small', 'medium', 'large'] as const;
export type WidgetDesign = typeof widgetDesigns[number];
export const widgetNames = { small: MOMENT_WIDGET_NAME, medium: 'WydMedium', large: 'WydLarge' } as const;
export const widgetLabels = { small: 'Small', medium: 'Medium', large: 'Large' } as const;
export const widgetCells = { small: '2 × 2', medium: '4 × 2', large: '4 × 3' } as const;
export const momentWidgetNames = Object.values(widgetNames);
export function widgetDesignForName(name: string): WidgetDesign | null {
  return widgetDesigns.find(design => widgetNames[design] === name) ?? null;
}
export function parseWidgetDesign(value: unknown): WidgetDesign {
  if (value === 'medium' || value === 'wide') return 'medium';
  if (value === 'large' || value === 'reactions') return 'large';
  return 'small';
}
export type WidgetReaction = 'heart';
export type WidgetAction = WidgetReaction | 'nudge' | 'camera';
export function isWidgetReaction(value: unknown): value is WidgetReaction { return value === 'heart'; }
export function widgetActionsForDesign(design: WidgetDesign): WidgetAction[] {
  return design === 'small' ? ['camera'] : ['heart', 'nudge', 'camera'];
}
export type WidgetSettings = { enabled: boolean; personId: string | null; design: WidgetDesign };
export type WidgetSnapshot = {
  ownerId: string | null;
  personId: string | null;
  name: string;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  updateId: string | null;
  photoData: `data:image${string}` | null;
  design?: WidgetDesign;
  myReaction?: WidgetReaction | null;
  isNew?: boolean;
  mode: 'moment' | 'waiting' | 'setup' | 'signed-out' | 'unavailable';
};
export const defaultWidgetSettings: WidgetSettings = { enabled: false, personId: null, design: 'small' };
export function widgetReplyUri(snapshot: WidgetSnapshot) {
  return snapshot.ownerId && snapshot.personId && snapshot.ownerId !== snapshot.personId && (isCurrentWidgetPhoto(snapshot, snapshot.ownerId) || snapshot.mode === 'waiting')
    ? `watchudoin://widget-reply?owner=${encodeURIComponent(snapshot.ownerId)}&person=${encodeURIComponent(snapshot.personId)}`
    : 'watchudoin://widget-settings';
}

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
  const emoji: Record<string, string> = { studying: '📚', chilling: '☕', working: '💻', eating: '🍽️', home: '🏡', outside: '🌿', gym: '💪', bedtime: '🌙', school: '🎒', morning: '☀️' };
  return emoji[text.toLowerCase()] ? `${text} ${emoji[text.toLowerCase()]}` : text;
}

export function widgetMomentUri(snapshot: WidgetSnapshot) {
  return snapshot.updateId && isCurrentWidgetPhoto(snapshot, snapshot.ownerId)
    ? `watchudoin://moment/${encodeURIComponent(snapshot.updateId)}`
    : 'watchudoin://widget-settings';
}
