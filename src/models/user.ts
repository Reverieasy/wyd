export type UserId = string;

export type User = {
  id: UserId;
  displayName: string;
  handle: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
