import type { User, UserId } from './user';
import type { Reaction } from './reaction';

export type UpdateStatus = 'studying' | 'chilling' | 'working' | 'home' | 'eating' | 'school' | 'morning';
export type PhotoPalette = 'accent' | 'love' | 'neutral';
export type PhotoSource = 'camera' | 'library';

export type PhotoAsset = {
  uri: string | null;
  placeholderLabel?: string;
  palette?: PhotoPalette;
};

export type DraftPhoto = {
  uri: string;
  source: PhotoSource;
  width: number;
  height: number;
  mimeType: string | null;
};

export type MomentUpdate = {
  id: string;
  senderId: UserId;
  sender: User;
  recipientIds: UserId[];
  circleIds?: string[];
  photoPath: string;
  photoUrl: string | null;
  statusText: string | null;
  caption: string | null;
  isQuiet: boolean;
  createdAt: string;
  expiresAt: string | null;
  seenAt: string | null;
  reactions: Reaction[];
};

export type UpdateDraft = {
  photo: DraftPhoto | null;
  status: UpdateStatus;
  recipientIds: UserId[];
  circleIds: string[];
  caption: string;
  isQuiet: boolean;
  sending: boolean;
  sendStage: 'idle' | 'preparing' | 'uploading' | 'creating';
  clientRequestId: string | null;
  error: string | null;
  respondingToNudgeId: string | null;
};
