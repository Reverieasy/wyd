export type RealtimeEventKind = 'moment' | 'reaction' | 'nudge' | 'nudge_response' | 'connection' | 'seen';

export type AppRealtimeEvent = {
  kind: RealtimeEventKind;
  entityId: string;
  updateId?: string;
};

const kinds = new Set<RealtimeEventKind>(['moment', 'reaction', 'nudge', 'nudge_response', 'connection', 'seen']);

export function parseRealtimeEvent(value: unknown): AppRealtimeEvent | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.kind !== 'string' || !kinds.has(payload.kind as RealtimeEventKind)) return null;
  if (typeof payload.entityId !== 'string' || payload.entityId.length === 0) return null;
  return {
    kind: payload.kind as RealtimeEventKind,
    entityId: payload.entityId,
    updateId: typeof payload.updateId === 'string' ? payload.updateId : undefined,
  };
}
