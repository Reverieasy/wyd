import type { UserId } from './user';
import type { User } from './user';

export type ConnectionId = string;
export type RelationshipType = 'partner' | 'best_friend' | 'family' | 'friend';
export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

export type Connection = {
  id: ConnectionId;
  requesterId: UserId;
  addresseeId: UserId;
  relationshipType: RelationshipType;
  status: ConnectionStatus;
  createdAt: string;
  acceptedAt: string | null;
};

export type ConnectionWithPerson = {
  connection: Connection;
  person: User;
  direction: 'incoming' | 'outgoing';
};
