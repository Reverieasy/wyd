import type { User, UserId } from './user';

export type Nudge = {
  id: string;
  senderId: UserId;
  receiverId: UserId;
  sender: User;
  status: 'pending' | 'responded' | 'dismissed';
  createdAt: string;
  seenAt: string | null;
  respondedAt: string | null;
  responseUpdateId: string | null;
};
