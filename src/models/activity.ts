import type { ReactionType } from './reaction';
import type { User } from './user';

export type ActivityKind = 'moment' | 'nudge' | 'reaction' | 'connection_request' | 'connection_accepted';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  actor: User;
  createdAt: string;
  read: boolean;
  nudgeId?: string;
  updateId?: string;
  connectionId?: string;
  reaction?: ReactionType;
  nudgeStatus?: 'pending' | 'responded' | 'dismissed';
  nudgeDirection?: 'incoming' | 'outgoing';
};
