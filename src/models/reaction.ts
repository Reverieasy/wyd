import type { User, UserId } from './user';

export type ReactionType = 'heart' | 'teary' | 'laugh' | 'fire' | 'eyes' | 'hug' | 'sparkles';

export type Reaction = {
  id: string;
  updateId: string;
  userId: UserId;
  user: User;
  type: ReactionType;
  createdAt: string;
};

export const reactionEmoji: Record<ReactionType, string> = {
  heart: '\u2764\uFE0F',
  teary: '\u{1F979}',
  laugh: '\u{1F602}',
  fire: '\u{1F525}',
  eyes: '\u{1F440}',
  hug: '\u{1FAF6}',
  sparkles: '\u2728',
};

export const reactionTypes = Object.keys(reactionEmoji) as ReactionType[];
