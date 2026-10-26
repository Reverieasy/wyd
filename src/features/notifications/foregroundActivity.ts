import type { ActivityItem } from '@/src/models';
import type { NotificationPreferences } from './notificationService';

// Initial history and pagination establish a baseline; only new activity creates popups.
// Keep the tracker inside the mounted session so one account cannot inherit another's alerts.
export class ForegroundActivityTracker {
  private userId: string | null = null;
  private initialized = false;
  private watermark = 0;
  private seen = new Map<string, string>();

  read(userId: string | null, hydrated: boolean, items: ActivityItem[], preferences: NotificationPreferences, active: boolean): ActivityItem[] {
    if (this.userId !== userId) {
      this.userId = userId; this.initialized = false; this.watermark = 0; this.seen.clear();
    }
    if (!userId || !hydrated) return [];
    const fresh: ActivityItem[] = [];
    for (const item of items) {
      const timestamp = Date.parse(item.createdAt);
      const version = `${item.createdAt}:${item.reaction ?? ''}`;
      const changed = this.seen.get(item.id) !== version;
      this.seen.set(item.id, version);
      if (!this.initialized || !active || !changed || !Number.isFinite(timestamp) || timestamp < this.watermark) continue;
      if (item.actor.id === userId || item.read || !item.updateId || !preferences.enabled) continue;
      if (item.kind === 'moment' && preferences.moments && !item.quiet) fresh.push(item);
      if (item.kind === 'reaction' && preferences.reactions) fresh.push(item);
      if (item.kind === 'comment' && preferences.comments) fresh.push(item);
    }
    this.initialized = true;
    this.watermark = Math.max(this.watermark, ...items.map(item => Date.parse(item.createdAt)).filter(Number.isFinite));
    // The time watermark still prevents replay after older entries are discarded.
    while (this.seen.size > 500) this.seen.delete(this.seen.keys().next().value!);
    return fresh.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }
}
