export type MomentNotification = { type: 'moment'; updateId: string; senderId: string };
export type NudgeNotification = { type: 'nudge'; nudgeId: string; senderId: string };
export type ReactionNotification = { type: 'reaction'; updateId: string; reactionId: string };
export type CommentNotification = { type: 'comment'; updateId: string; commentId: string };
export type ConnectionNotification = { type: 'connection_request' | 'connection_accepted'; connectionId: string };
export type AppNotificationData = MomentNotification | NudgeNotification | ReactionNotification | CommentNotification | ConnectionNotification;
export type PushEventType = AppNotificationData['type'];

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parseNotificationData(value: unknown): AppNotificationData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.type === 'moment') {
    const updateId = stringValue(data.updateId);
    const senderId = stringValue(data.senderId);
    return updateId && senderId ? { type: 'moment', updateId, senderId } : null;
  }
  if (data.type === 'nudge') {
    const nudgeId = stringValue(data.nudgeId);
    const senderId = stringValue(data.senderId);
    return nudgeId && senderId ? { type: 'nudge', nudgeId, senderId } : null;
  }
  if (data.type === 'reaction') {
    const updateId = stringValue(data.updateId);
    const reactionId = stringValue(data.reactionId);
    return updateId && reactionId ? { type: 'reaction', updateId, reactionId } : null;
  }
  if (data.type === 'comment') {
    const updateId = stringValue(data.updateId), commentId = stringValue(data.commentId);
    return updateId && commentId ? { type: 'comment', updateId, commentId } : null;
  }
  if (data.type === 'connection_request' || data.type === 'connection_accepted') {
    const connectionId = stringValue(data.connectionId);
    return connectionId ? { type: data.type, connectionId } : null;
  }
  return null;
}

export function notificationEventKey(data: AppNotificationData) {
  if (data.type === 'moment') return `${data.type}:${data.updateId}`;
  if (data.type === 'nudge') return `${data.type}:${data.nudgeId}`;
  if (data.type === 'reaction') return `${data.type}:${data.reactionId}`;
  if (data.type === 'comment') return `${data.type}:${data.commentId}`;
  return `${data.type}:${data.connectionId}`;
}
